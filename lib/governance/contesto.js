// lib/governance/contesto.js
//
// Minimizzazione contestuale: all'LLM arrivano SOLO le sezioni di dati del
// tenant che servono all'intento corrente (allowlist per categoria). Esempio:
// per una disdetta non serve il listino; per un'informazione sul personale
// non serve altro. Il pack può sovrascrivere con `intent.contesto: [...]`.
// Sezioni: info (info_generali), orari, servizi, personale, kb.

export const SEZIONI = ['info', 'orari', 'servizi', 'personale', 'kb'];

const DEFAULT_PER_CATEGORIA = {
  INFORMATION: SEZIONI, DISCOVERY: SEZIONI, FOLLOW_UP: SEZIONI, ADMIN: SEZIONI,
  BOOKING: ['orari', 'servizi'],
  LEAD: ['orari', 'servizi'],
  SUPPORT: ['orari'],
  EMERGENCY: ['orari'],
  COMPLAINT: [], CANCELLATION: [], RESCHEDULE: [], HUMAN_HANDOFF: [],
};

export function sezioniPerIntent(intentId, pack, secondari = []) {
  const set = new Set();
  for (const id of [intentId, ...secondari]) {
    const def = (pack.intents || []).find((i) => i.id === id);
    if (!def) continue;
    const lista = Array.isArray(def.contesto) ? def.contesto : (DEFAULT_PER_CATEGORIA[def.categoria] || ['orari']);
    for (const s of lista) if (SEZIONI.includes(s)) set.add(s);
  }
  // Intent sconosciuto/non definito: contesto minimo e prudente.
  if (set.size === 0 && !(pack.intents || []).some((i) => i.id === intentId)) set.add('orari');
  return [...set];
}

// Restituisce i soli dati autorizzati, nella stessa forma attesa dal prompt.
export function costruisciContesto({ intentId, secondari = [], pack, config, servizi = [], personale = [], contestoKB = '' }) {
  const sezioni = sezioniPerIntent(intentId, pack, secondari);
  const ok = new Set(sezioni);
  const cfg = { ...config };
  const out = {
    sezioni,
    config: {
      tono: cfg.tono,
      info_generali: ok.has('info') ? cfg.info_generali : undefined,
      orari_apertura: ok.has('orari') ? cfg.orari_apertura : undefined,
    },
    servizi: ok.has('servizi') ? servizi : [],
    personale: ok.has('personale') ? personale : [],
    contestoKB: ok.has('kb') ? contestoKB : '',
  };
  return out;
}
