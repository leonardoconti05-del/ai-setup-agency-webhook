// lib/engine/harness.js
//
// Runtime Compatibility Harness. Prova che un Sector Pack (anche in stato TEST) funziona con lo STESSO percorso
// del runtime reale, senza attivarlo e senza modificare il database:
//
//   caricaPackPerHarness (stesso codice di caricaPackProduzione)
//     → eseguiMotore (orchestratore reale: analisi, piano, template/LLM, verificaRisposta, fallback)
//     → authorizeAction (governance reale: registry agenti/azioni, policy, deny-by-default)
//
// Garanzie:
//  - NESSUNA scrittura: il database è raggiungibile solo in lettura (ogni richiesta non-GET viene bloccata,
//    contata e fa fallire l'harness); lo stato del profilo viene riletto prima e dopo e deve coincidere;
//  - NESSUNA chiamata al modello reale (zero costo): le due chiamate LLM sono simulate, quindi si verifica
//    l'integrazione (prompt, contesto, verifica, fallback, governance), NON la qualità delle risposte LLM;
//  - NESSUN dato di clienti: tenant sintetico, messaggi di prova ricavati dal pack stesso;
//  - è raggiungibile solo dall'endpoint amministrativo autenticato (PACK_ADMIN_TOKEN).
//
// Limite dichiarato: per leggere il pack con la policy del tenant sintetico, la riga `tenant_action_policy` del
// tenant di prova è simulata (autonomia 5). Registry di agenti e azioni invece sono letti dal database reale.

import { caricaPackPerHarness, AZIONI } from './pack.js';
import { eseguiMotore } from './orchestratore.js';
import { authorizeAction } from '../governance/action-gateway.js';
import { createTenantContext } from '../core/contracts.js';

export const HARNESS_VERSION = 'harness-1';
const TENANT_PROVA = 'harness-tenant-prova';
const RISPOSTA_NEUTRA = 'Grazie per il messaggio. Può darmi qualche dettaglio in più, così la aiuto meglio?';
const RE_RISPOSTA_ROTTA = /undefined|\bnull\b|\[object|\{\{|\bNaN\b/;

const json = (status, corpo) => ({ ok: status < 300, status, json: async () => corpo, text: async () => JSON.stringify(corpo) });

// Database in sola lettura. Le scritture non partono mai: vengono contate.
function creaDbProtetto(fetchReale, conteggi) {
  return async (url, o = {}) => {
    const metodo = (o.method || 'GET').toUpperCase();
    if (metodo !== 'GET') { conteggi.scritture_bloccate++; return json(201, []); }
    const u = new URL(url);
    if (u.pathname.endsWith('/tenant_action_policy') && u.searchParams.get('cliente_id') === `eq.${TENANT_PROVA}`) {
      conteggi.policy_simulate++;
      const agent = (u.searchParams.get('agent_id') || '').replace(/^eq\./, '');
      const action = decodeURIComponent((u.searchParams.get('action') || '').replace(/^eq\./, ''));
      return json(200, [{ agent_id: agent, action, autonomy_level: 5, condizioni: null }]);
    }
    conteggi.letture++;
    return fetchReale(url, o);
  };
}

// Modello simulato: analisi = intent della sonda; risposta = frase neutra e sicura.
function llmSimulato(intentSonda) {
  return async (url, o) => {
    const body = JSON.parse(o.body);
    if (body.tools) {
      return json(200, { content: [{ type: 'tool_use', input: { intent: intentSonda || 'unknown', confidence: 0.9, entities: {}, urgency: 'LOW' } }], usage: { input_tokens: 0, output_tokens: 0 } });
    }
    return json(200, { content: [{ type: 'text', text: RISPOSTA_NEUTRA }], usage: { input_tokens: 0, output_tokens: 0 } });
  };
}

export function costruisciSonde(pack) {
  const sonde = [];
  for (const i of pack.intents || []) {
    const msg = (i.esempi || [])[0];
    if (msg) sonde.push({ codice: `intent:${i.id}`, messaggio: msg, intent: i.id, attesa: null });
  }
  const crit = pack.urgency_rules?.critical?.[0];
  if (crit) sonde.push({ codice: 'urgenza_critica', messaggio: crit, intent: 'unknown', attesa: 'escalation' });
  const ho = pack.escalation_rules?.handoff_triggers?.[0];
  if (ho) sonde.push({ codice: 'richiesta_persona', messaggio: `vorrei ${ho}`, intent: 'unknown', attesa: 'handoff' });
  const dg = pack.safety_rules?.diagnosi_patterns?.[0];
  if (dg) sonde.push({ codice: 'richiesta_sensibile', messaggio: dg, intent: 'unknown', attesa: null });
  sonde.push({ codice: 'saluto', messaggio: 'ciao', intent: 'unknown', attesa: null });
  return sonde;
}

function idAzioneGovernance(esito) {
  if (esito.azione?.action === 'emergency_escalation') return 'emergency_escalation';
  return esito.handoff ? 'handoff' : 'reply';
}

export async function eseguiHarness({ SUPABASE_URL, headers, fetchImpl = fetch }, settore, { stato = 'test' } = {}) {
  const conteggi = { letture: 0, scritture_bloccate: 0, policy_simulate: 0 };
  const db = creaDbProtetto(fetchImpl, conteggi);
  const base = { harness_version: HARNESS_VERSION, settore, stato_richiesto: stato };
  const leggiStato = async () => {
    const r = await db(`${SUPABASE_URL}/rest/v1/sector_profiles?settore=eq.${encodeURIComponent(settore)}&select=id,version,status&order=version.desc`, { headers });
    return JSON.stringify(await r.json());
  };

  let statoPrima;
  try { statoPrima = await leggiStato(); } catch (e) { return { ...base, ok: false, errori: [`database non leggibile: ${String(e.message || e).slice(0, 120)}`] }; }

  const caricato = await caricaPackPerHarness(SUPABASE_URL, headers, settore, { stato, fetchImpl: db });
  if (!caricato) return { ...base, ok: false, errori: [`nessun pack valido in stato ${stato} per questo settore`], scritture_db: conteggi.scritture_bloccate };

  const pack = caricato.pack;
  const campiTenant = [pack.identity.entita_nome];
  const config = { google_calendar_id: null, info_generali: {} };
  const sonde = costruisciSonde(pack);
  const fallite = [];
  const governance = { ALLOW: 0, REQUIRE_APPROVAL: 0, DENY: 0 };
  const azioniViste = {};
  const origini = {};
  let tenantCtx;
  try {
    tenantCtx = Object.freeze({ ...createTenantContext({ clienteId: TENANT_PROVA, actor: 'agent:whatsapp', agent: 'whatsapp', requestId: 'harness', authorizationSource: 'runtime-compat-harness' }), server_derived: true });
  } catch (e) { return { ...base, ok: false, errori: [`contesto tenant di prova non creato: ${String(e.message || e).slice(0, 120)}`] }; }

  for (const s of sonde) {
    const falla = (motivo) => fallite.push({ sonda: s.codice, motivo });
    let r;
    try {
      r = await eseguiMotore({
        caricato, config, nomeAttivita: 'Attività di prova', history: [{ role: 'user', content: s.messaggio }], messaggio: s.messaggio,
        statoPrecedente: undefined, servizi: [], personale: [], campiTenant, apiKey: 'harness', fetchImpl: llmSimulato(s.intent),
      });
    } catch (e) { falla(`il motore ha lanciato un errore: ${String(e.message || e).slice(0, 120)}`); continue; }

    azioniViste[r.azione?.action] = (azioniViste[r.azione?.action] || 0) + 1;
    origini[r.telemetria?.origine_risposta] = (origini[r.telemetria?.origine_risposta] || 0) + 1;
    if (typeof r.reply !== 'string' || r.reply.trim().length < 3 || r.reply.length > 1200) falla('risposta vuota o fuori misura');
    else if (RE_RISPOSTA_ROTTA.test(r.reply)) falla('risposta con segnaposto non risolti');
    if (!AZIONI.includes(r.azione?.action)) falla(`azione non riconosciuta: ${r.azione?.action}`);
    if (r.telemetria?.settore !== settore) falla(`telemetria con settore diverso (${r.telemetria?.settore})`);
    if (r.telemetria?.pack_version !== caricato.version) falla('telemetria con versione di pack diversa');
    if (s.attesa === 'escalation' && !(['emergency_escalation', 'human_handoff'].includes(r.azione?.action) && r.handoff)) falla(`urgenza critica non scalata (azione: ${r.azione?.action})`);
    if (s.attesa === 'handoff' && !(r.azione?.action === 'human_handoff' && r.handoff)) falla(`richiesta di una persona non gestita (azione: ${r.azione?.action})`);

    try {
      const v = await authorizeAction({
        tenantContext: tenantCtx, action: idAzioneGovernance(r), payload: { cliente_id: TENANT_PROVA, bozza: r.reply, intent: r.stato?.intent || null },
        reason: 'harness_compatibilita', sources: [], SUPABASE_URL, headers, fetchImpl: db,
      });
      governance[v.verdict] = (governance[v.verdict] || 0) + 1;
      if (v.verdict === 'DENY') falla(`governance ha negato ${idAzioneGovernance(r)}: ${v.reason}`);
    } catch (e) { falla(`governance: errore ${String(e.message || e).slice(0, 100)}`); }
  }

  let statoDopo = statoPrima;
  try { statoDopo = await leggiStato(); } catch { statoDopo = 'illeggibile'; }
  const statoInvariato = statoDopo === statoPrima;
  const errori = [];
  if (conteggi.scritture_bloccate > 0) errori.push(`l'harness ha tentato ${conteggi.scritture_bloccate} scritture (bloccate)`);
  if (!statoInvariato) errori.push('lo stato del profilo nel database è cambiato durante la prova');
  if (fallite.length) errori.push(`${fallite.length} sonde fallite`);

  return {
    ...base, ok: errori.length === 0, pack_version: caricato.version, faq: caricato.faq.length,
    sonde: sonde.length, sonde_passate: sonde.length - new Set(fallite.map((f) => f.sonda)).size, fallite,
    azioni: azioniViste, origine_risposte: origini, governance,
    scritture_db: conteggi.scritture_bloccate, letture_db: conteggi.letture, stato_db_invariato: statoInvariato,
    limiti: ['modello simulato: non misura la qualità delle risposte LLM', 'policy del tenant di prova simulata (registry reali)'],
    errori,
  };
}
