// lib/core/health.js — contratto di salute di Core, SOLA LETTURA, per Jarvis.
//
// Garanzie (verificate da tests/core-health.test.js):
//  - nessuna scrittura: il lettore accetta solo GET e solo tabelle in una lista chiusa;
//  - nessun testo libero dei clienti nel risultato (niente conversazioni, domande, documenti, riepiloghi, nomi, numeri);
//  - ambito esplicito: «platform» (aggregato di agenzia) oppure «tenant» (una sola attività, filtro cliente_id su OGNI lettura);
//  - una lettura fallita non rompe il rapporto: il controllo diventa «unknown», mai «ok».
// Il rapporto descrive; non decide e non agisce. Le azioni passano dall'action gateway (lib/governance/).
import { createHealthReport } from './contracts.js';
import { SETTORI_REGOLAMENTATI } from '../admin/pack-pipeline.js';

export const TABELLE_LEGGIBILI = Object.freeze(['sector_profiles', 'sector_eval_runs', 'sector_pack_audit', 'event_log', 'approval_requests', 'lacune_conoscenza', 'documents', 'knowledge_chunks', 'clienti', 'configurazioni_cliente']);
export const SOGLIE = Object.freeze({ errori24hWarn: 1, errori24hFail: 50, authFalliti24hWarn: 5, approvazioniVecchieOre: 24 });
const LIMITE = 5000;

export function creaLettore({ SUPABASE_URL, headers, fetchImpl }) {
  return async function leggi(tabella, query = '') {
    if (!TABELLE_LEGGIBILI.includes(tabella)) throw new Error(`tabella non consentita: ${tabella}`);
    if (/[;\s]/.test(query)) throw new Error('query non valida');
    const url = `${SUPABASE_URL}/rest/v1/${tabella}?${query}${query ? '&' : ''}limit=${LIMITE}`;
    const r = await (fetchImpl || fetch)(url, { method: 'GET', headers });
    if (!r.ok) throw new Error(`lettura ${tabella} → HTTP ${r.status}`);
    const json = await r.json();
    return Array.isArray(json) ? json : [];
  };
}

const conta = (righe, chiave) => righe.reduce((m, r) => ((m[r[chiave]] = (m[r[chiave]] || 0) + 1), m), {});
const ore = (n, adesso) => new Date(adesso.getTime() - n * 3600 * 1000).toISOString();

async function controllo(id, fn) {
  try { return await fn(); } catch (e) { return { check: { id, status: 'unknown', detail: `lettura non riuscita (${String(e.message).slice(0, 80)})` } }; }
}

export async function getCoreHealth(context, leggi, { adesso = new Date() } = {}) {
  if (!context?.request_id) throw new Error('contesto mancante');
  const tenant = context.scope === 'platform' ? null : context.cliente_id;
  if (context.scope !== 'platform' && !tenant) throw new Error('contesto tenant senza cliente_id');
  const filtro = tenant ? `&cliente_id=eq.${encodeURIComponent(tenant)}` : '';
  const checks = [];
  const data = {};

  if (!tenant) {
    // --- pack di settore ---
    const r1 = await controllo('sector_packs', async () => {
      const profili = await leggi('sector_profiles', 'select=id,settore,version,status');
      const gate = await leggi('sector_eval_runs', 'select=profile_id&gate_passed=eq.true');
      const conGate = new Set(gate.map((g) => g.profile_id));
      const prod = profili.filter((p) => p.status === 'production');
      const senzaGate = prod.filter((p) => !conGate.has(p.id)).map((p) => p.settore);
      const regolamentatiInProd = prod.filter((p) => SETTORI_REGOLAMENTATI.includes(p.settore)).map((p) => p.settore);
      data.packs = { per_stato: conta(profili, 'status'), production: prod.map((p) => `${p.settore}@v${p.version}`).sort(), regolamentati_in_production: regolamentatiInProd, production_senza_gate: senzaGate };
      if (senzaGate.length) return { check: { id: 'sector_packs', status: 'fail', detail: `${senzaGate.length} pack in production senza valutazione superata` } };
      if (regolamentatiInProd.length) return { check: { id: 'sector_packs', status: 'warn', detail: `${regolamentatiInProd.length} settori regolamentati in production: verificare la revisione professionale` } };
      return { check: { id: 'sector_packs', status: 'ok', detail: `${prod.length} pack in production, tutti con valutazione superata` } };
    });
    checks.push(r1.check);

    // --- registro di audit dei pack ---
    const r2 = await controllo('pack_audit', async () => {
      const righe = await leggi('sector_pack_audit', `select=created_at,evento,esito&created_at=gte.${ore(24, adesso)}`);
      const authFalliti = righe.filter((r) => r.evento === 'auth_failed').length;
      const errori = righe.filter((r) => r.esito === 'errore').length;
      data.audit_24h = { eventi: righe.length, auth_falliti: authFalliti, errori };
      if (authFalliti >= SOGLIE.authFalliti24hWarn) return { check: { id: 'pack_audit', status: 'warn', detail: `${authFalliti} accessi amministrativi falliti nelle ultime 24 ore` } };
      return { check: { id: 'pack_audit', status: 'ok', detail: `${righe.length} eventi nelle ultime 24 ore` } };
    });
    checks.push(r2.check);

    // --- numero di tenant (solo conteggio) ---
    const r3 = await controllo('tenants', async () => {
      const t = await leggi('clienti', 'select=id');
      data.tenants = { totale: t.length };
      return { check: { id: 'tenants', status: 'ok', detail: `${t.length} attività registrate` } };
    });
    checks.push(r3.check);
  } else {
    const r0 = await controllo('tenant_config', async () => {
      const c = await leggi('configurazioni_cliente', `select=settore,attivo${filtro}`);
      if (!c.length) return { check: { id: 'tenant_config', status: 'fail', detail: 'nessuna configurazione per questo tenant' } };
      const settori = [...new Set(c.map((x) => x.settore))];
      const profili = await leggi('sector_profiles', 'select=settore&status=eq.production');
      const prod = new Set(profili.map((p) => p.settore));
      const senzaPack = settori.filter((s) => !prod.has(s));
      data.config = { numeri_attivi: c.filter((x) => x.attivo).length, settori: settori, settori_senza_pack_production: senzaPack };
      if (senzaPack.length) return { check: { id: 'tenant_config', status: 'warn', detail: 'il settore del tenant non ha un pack in production' } };
      return { check: { id: 'tenant_config', status: 'ok', detail: 'configurazione presente con pack in production' } };
    });
    checks.push(r0.check);

    const r1 = await controllo('knowledge', async () => {
      const d = await leggi('documents', `select=id${filtro}`);
      const k = await leggi('knowledge_chunks', `select=id${filtro}`);
      data.knowledge = { documenti: d.length, chunk: k.length };
      return { check: { id: 'knowledge', status: 'ok', detail: `${d.length} documenti, ${k.length} frammenti` } };
    });
    checks.push(r1.check);
  }

  // --- comuni: errori, approvazioni, lacune (con filtro tenant quando serve) ---
  const r4 = await controllo('errors_24h', async () => {
    const e = await leggi('event_log', `select=fase&stato=eq.errore&created_at=gte.${ore(24, adesso)}${filtro}`);
    data.errori_24h = { totale: e.length, per_fase: conta(e, 'fase') };
    if (e.length >= SOGLIE.errori24hFail) return { check: { id: 'errors_24h', status: 'fail', detail: `${e.length} errori nelle ultime 24 ore` } };
    if (e.length >= SOGLIE.errori24hWarn) return { check: { id: 'errors_24h', status: 'warn', detail: `${e.length} errori nelle ultime 24 ore` } };
    return { check: { id: 'errors_24h', status: 'ok', detail: 'nessun errore nelle ultime 24 ore' } };
  });
  checks.push(r4.check);

  const r5 = await controllo('approvals', async () => {
    const a = await leggi('approval_requests', `select=created_at&stato=eq.pending${filtro}`);
    const vecchie = a.filter((x) => new Date(x.created_at) < new Date(ore(SOGLIE.approvazioniVecchieOre, adesso))).length;
    data.approvazioni = { in_attesa: a.length, in_attesa_da_oltre_24h: vecchie };
    if (vecchie) return { check: { id: 'approvals', status: 'warn', detail: `${vecchie} richieste di approvazione in attesa da oltre ${SOGLIE.approvazioniVecchieOre} ore` } };
    return { check: { id: 'approvals', status: 'ok', detail: `${a.length} richieste in attesa` } };
  });
  checks.push(r5.check);

  const r6 = await controllo('knowledge_gaps', async () => {
    const g = await leggi('lacune_conoscenza', `select=volte&stato=eq.aperta${filtro}`);
    data.lacune_aperte = { totale: g.length };
    return { check: { id: 'knowledge_gaps', status: 'ok', detail: `${g.length} lacune di conoscenza aperte` } };
  });
  checks.push(r6.check);

  return createHealthReport({ context, checks, data, generatedAt: adesso.toISOString() });
}
