// lib/governance/lineage.js
//
// Elenco STRUTTURATO delle fonti che hanno sostenuto una risposta: serve al
// titolare ("questa informazione viene da X") e al ledger. Si registra solo
// ciò che è stato davvero messo a disposizione del modello. Nessun contenuto,
// solo riferimenti.
export function fontiUsate({ sezioni, config, servizi = [], personale = [], faqTrovata = null, contestoKB = '', caricato = null }) {
  const f = [];
  if (caricato) f.push({ tipo: 'pack', settore: caricato.settore, versione: caricato.version });
  if (faqTrovata) f.push({ tipo: 'faq_settore', domanda: faqTrovata.domanda_canonica });
  const s = new Set(sezioni || []);
  if (s.has('info') && config?.info_generali && typeof config.info_generali === 'object') {
    const chiavi = Object.entries(config.info_generali).filter(([, v]) => v && String(v).trim()).map(([k]) => k);
    if (chiavi.length) f.push({ tipo: 'info_generali', chiavi });
  }
  if (s.has('orari') && config?.orari_apertura) f.push({ tipo: 'orari_apertura' });
  if (s.has('servizi') && servizi.length) f.push({ tipo: 'servizi', n: servizi.length });
  if (s.has('personale') && personale.length) f.push({ tipo: 'personale', n: personale.length });
  if (s.has('kb') && contestoKB) f.push({ tipo: 'knowledge_base' });
  return f;
}
