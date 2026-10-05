// lib/engine/pack.js
//
// Sector Pack: la conoscenza verticale di un settore (vedi
// docs/SECTOR_ENGINE.md per lo schema completo). Qui: validazione dello
// schema, costruzione dell'indice normalizzato usato dal motore, e
// caricamento da Supabase con cache.
//
// Principio: il codice del motore è identico per ogni settore; tutto ciò che
// cambia da un settore all'altro sta nei dati del pack.

import { normalizza } from './text.js';

export const STATUS_PACK = ['draft', 'test', 'approved', 'production', 'archived'];
export const LIVELLI = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const CATEGORIE_INTENT = [
  'DISCOVERY', 'INFORMATION', 'BOOKING', 'LEAD', 'SUPPORT', 'ADMIN', 'FOLLOW_UP',
  'COMPLAINT', 'CANCELLATION', 'RESCHEDULE', 'EMERGENCY', 'HUMAN_HANDOFF',
];
export const AZIONI = [
  'ask_missing_information', 'search_knowledge', 'search_calendar', 'propose_slot', 'create_booking',
  'update_booking', 'cancel_booking', 'create_lead', 'notify_owner', 'human_handoff',
  'emergency_escalation', 'answer_information', 'save_request',
];

const obbligatorie = ['identity', 'lexicon', 'intents', 'entities', 'urgency_rules', 'escalation_rules', 'safety_rules', 'confidence_thresholds'];

export function validaPack(pack) {
  const errori = [];
  if (!pack || typeof pack !== 'object') return { ok: false, errori: ['pack mancante o non è un oggetto'] };
  for (const k of obbligatorie) if (pack[k] === undefined) errori.push(`sezione mancante: ${k}`);
  if (errori.length) return { ok: false, errori };

  if (!pack.identity.entita_nome) errori.push('identity.entita_nome mancante (campo che contiene il nome del cliente, es. nome_paziente)');
  if (!Array.isArray(pack.lexicon)) errori.push('lexicon deve essere un array');
  if (!Array.isArray(pack.intents) || pack.intents.length === 0) errori.push('intents deve essere un array non vuoto');
  if (!Array.isArray(pack.entities)) errori.push('entities deve essere un array');

  const idIntent = new Set();
  const idEntita = new Set((pack.entities || []).map((e) => e.id));
  for (const i of pack.intents || []) {
    if (!i.id) errori.push('intent senza id');
    if (idIntent.has(i.id)) errori.push(`intent duplicato: ${i.id}`);
    idIntent.add(i.id);
    if (!Array.isArray(i.esempi) || i.esempi.length === 0) errori.push(`intent ${i.id}: servono esempi`);
    if (!CATEGORIE_INTENT.includes(i.categoria)) errori.push(`intent ${i.id}: categoria non valida (${i.categoria})`);
    for (const c of i.combinazioni || []) {
      if (!idEntita.has(c.entity)) errori.push(`intent ${i.id}: combinazione su entità non definita ${c.entity}`);
    }
    if (i.safety_level && !LIVELLI.includes(i.safety_level)) errori.push(`intent ${i.id}: safety_level non valido`);
    for (const a of i.actions || []) if (!AZIONI.includes(a)) errori.push(`intent ${i.id}: azione sconosciuta ${a}`);
  }
  for (const i of pack.intents || []) {
    for (const e of [...(i.required_entities || []), ...(i.optional_entities || [])]) {
      if (!idEntita.has(e)) errori.push(`intent ${i.id}: entità non definita ${e}`);
    }
  }
  for (const v of pack.lexicon || []) {
    if (!v.canonical) errori.push('voce lessico senza canonical');
    if (v.entity && !idEntita.has(v.entity)) errori.push(`lessico ${v.canonical}: entità non definita ${v.entity}`);
    if (v.intent && !idIntent.has(v.intent)) errori.push(`lessico ${v.canonical}: intent non definito ${v.intent}`);
  }
  const t = pack.confidence_thresholds;
  if (!(t.intent_min > 0 && t.intent_ok > t.intent_min && t.intent_ok <= 1)) errori.push('confidence_thresholds: servono 0 < intent_min < intent_ok <= 1');
  return { ok: errori.length === 0, errori };
}

// Indice pre-calcolato (normalizzazione fatta UNA volta, non a ogni messaggio).
export function costruisciIndice(pack, faq = []) {
  const lessico = (pack.lexicon || []).map((v) => {
    const forme = [v.canonical.replace(/_/g, ' '), ...(v.synonyms || []), ...(v.abbreviations || []), ...(v.slang || []), ...(v.errors || [])]
      .map(normalizza).filter(Boolean);
    return { ...v, forme: [...new Set(forme)] };
  });
  const intents = (pack.intents || []).map((i) => ({
    ...i,
    esempiNorm: (i.esempi || []).map(normalizza).filter(Boolean),
    keywordsNorm: (i.keywords || []).map(normalizza).filter(Boolean),
    combinazioni: (i.combinazioni || []).map((c) => ({ ...c, conNorm: (c.con || []).map(normalizza).filter(Boolean) })),
  }));
  const urgency = {};
  for (const l of ['critical', 'high', 'medium']) urgency[l] = (pack.urgency_rules?.[l] || []).map(normalizza).filter(Boolean);
  const faqIdx = faq.map((f) => ({
    ...f,
    variantiNorm: [f.domanda_canonica, ...(f.varianti || [])].map(normalizza).filter(Boolean),
  }));
  return {
    lessico,
    intents,
    urgency,
    handoff: (pack.escalation_rules?.handoff_triggers || []).map(normalizza).filter(Boolean),
    diagnosi: (pack.safety_rules?.diagnosi_patterns || []).map(normalizza).filter(Boolean),
    faq: faqIdx,
    entitaPerId: Object.fromEntries((pack.entities || []).map((e) => [e.id, e])),
  };
}

// ===== Caricamento da Supabase, con cache in memoria =====
// Cache per istanza serverless: riduce le query a Supabase per messaggio
// (costo + latenza). TTL breve: un nuovo pack promosso entra in produzione
// al massimo entro TTL_MS. Isolamento: la query filtra SEMPRE per settore e
// status=production; nessun dato di tenant passa da qui.
const TTL_MS = 60_000;
const cache = new Map();

export function svuotaCachePack() { cache.clear(); }

export async function caricaPackProduzione(SUPABASE_URL, headers, settore, { fetchImpl = fetch, now = Date.now } = {}) {
  if (!settore) return null;
  const hit = cache.get(settore);
  if (hit && now() - hit.t < TTL_MS) return hit.valore;
  let valore = null;
  try {
    const q = `${SUPABASE_URL}/rest/v1/sector_profiles?settore=eq.${encodeURIComponent(settore)}&status=eq.production&select=id,version,pack&limit=1`;
    const res = await fetchImpl(q, { headers });
    const righe = await res.json();
    if (Array.isArray(righe) && righe[0]) {
      const { ok, errori } = validaPack(righe[0].pack);
      if (ok) {
        const faqRes = await fetchImpl(
          `${SUPABASE_URL}/rest/v1/sector_faq?settore=eq.${encodeURIComponent(settore)}&status=eq.production&select=intent,domanda_canonica,varianti,risposta_base,condizioni`,
          { headers }
        );
        const faqRighe = await faqRes.json();
        const faq = Array.isArray(faqRighe) ? faqRighe : [];
        valore = { id: righe[0].id, version: righe[0].version, settore, pack: righe[0].pack, faq, indice: costruisciIndice(righe[0].pack, faq) };
      } else {
        console.error(`Sector pack ${settore} non valido, uso il percorso legacy:`, errori);
      }
    }
  } catch (e) {
    // Qualunque problema (tabella non ancora creata, rete): percorso legacy.
    console.error('Errore caricamento sector pack (percorso legacy):', e);
    valore = null;
  }
  cache.set(settore, { t: now(), valore });
  return valore;
}
