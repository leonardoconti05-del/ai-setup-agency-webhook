// lib/engine/safety.js
//
// Livello di sicurezza SEPARATO dalla generazione: decide urgenza/rischio e
// controlla che la risposta del modello non inventi nulla. Le regole sono nei
// dati del pack (urgency_rules, safety_rules): il tenant non può disattivarle
// (non esiste nessun campo di configurazione tenant che le tocchi).

import { normalizza, contieneFrase } from './text.js';
import { LIVELLI } from './pack.js';

export function maxLivello(a, b) {
  return LIVELLI[Math.max(LIVELLI.indexOf(a || 'LOW'), LIVELLI.indexOf(b || 'LOW'))];
}

// Classifica il MESSAGGIO del cliente.
export function classificaMessaggio(testoNorm, indice) {
  const motivi = [];
  let level = 'LOW';
  const mappa = [['critical', 'CRITICAL'], ['high', 'HIGH'], ['medium', 'MEDIUM']];
  for (const [chiave, livello] of mappa) {
    for (const frase of indice.urgency[chiave]) {
      if (contieneFrase(testoNorm, frase, { negazione: true })) {
        motivi.push(`${chiave}:${frase}`);
        level = maxLivello(level, livello);
      }
    }
  }
  const richiestaUmano = indice.handoff.some((f) => contieneFrase(testoNorm, f));
  const richiestaSensibile = indice.diagnosi.some((f) => contieneFrase(testoNorm, f));
  return { level, motivi, richiestaUmano, richiestaSensibile };
}

// ===== Anti-allucinazione sulla RISPOSTA =====
// `testoConsentito` = tutto ciò che è lecito citare: dati del tenant
// (info_generali, servizi/prezzi, orari), contesto KB, fatti di settore,
// messaggio del cliente e slot realmente proposti. Qualunque importo o orario
// nella risposta che non compare lì è considerato inventato.
const RE_IMPORTO = /(?:€\s*(\d+(?:[.,]\d+)?))|(?:(\d+(?:[.,]\d+)?)\s*(?:€|euro\b))/gi;
const RE_PERC = /(\d+(?:[.,]\d+)?)\s?%/g;
const RE_ORARIO = /\b(?:([01]?\d|2[0-3])[:.]([0-5]\d)|alle\s+(?:ore\s+)?([01]?\d|2[0-3]))\b/gi;
const RE_PROMESSE = /\b(garantit[oaie]|garantiamo|sicuramente guarir|senza alcun rischio|100\s?%|risultato assicurato)\b/i;

function normNum(n) {
  return String(n).replace(',', '.').replace(/\.0+$/, '').replace(/^0+(?=\d)/, '');
}

function numeri(testo) {
  return new Set((String(testo).match(/\d+(?:[.,]\d+)?/g) || []).map(normNum));
}

const RE_CHIEDE_NOME = /\b(come\s+(ti|si)\s+chiam[ia]\w*|qual\s*(e|è)\s+(il\s+)?(tuo|suo|vostro)\s+nome|(il\s+)?(tuo|suo)\s+nome(\s+e\s+cognome)?\b.*\?|nome\s+e\s+cognome|mi\s+(dici|dice|indica|dà|da)\s+(il\s+)?(tuo|suo)\s+nome)/i;

export function verificaRisposta(risposta, { pack, testoConsentito = '', entitaNote = {} } = {}) {
  const violazioni = [];
  const campoNome = pack?.identity?.entita_nome;
  if (campoNome && entitaNote?.[campoNome] && RE_CHIEDE_NOME.test(normalizza(risposta))) {
    violazioni.push({ tipo: 'richiede_dato_noto', dettaglio: campoNome });
  }
  const ammessi = numeri(testoConsentito);

  for (const m of String(risposta).matchAll(RE_IMPORTO)) {
    const v = normNum(m[1] || m[2]);
    if (!ammessi.has(v)) violazioni.push({ tipo: 'importo_non_in_fonte', dettaglio: m[0].trim() });
  }
  for (const m of String(risposta).matchAll(RE_PERC)) {
    if (!ammessi.has(normNum(m[1]))) violazioni.push({ tipo: 'percentuale_non_in_fonte', dettaglio: m[0].trim() });
  }
  for (const m of String(risposta).matchAll(RE_ORARIO)) {
    // "alle 17" -> ora in m[3]; "17:30" -> ora m[1], minuti m[2].
    const ora = normNum(m[3] !== undefined ? m[3] : m[1]);
    const minutiOk = m[2] === undefined || m[2] === '00' || ammessi.has(normNum(m[2]));
    if (!(ammessi.has(ora) && minutiOk)) violazioni.push({ tipo: 'orario_non_in_fonte', dettaglio: m[0].trim() });
  }
  if (RE_PROMESSE.test(risposta)) violazioni.push({ tipo: 'promessa_non_consentita', dettaglio: String(risposta).match(RE_PROMESSE)[0] });

  const norm = normalizza(risposta);
  for (const p of [...(pack?.safety_rules?.vietato || []), ...(pack?.prohibited_claims || [])]) {
    const pn = normalizza(p);
    if (pn && contieneFrase(norm, pn)) violazioni.push({ tipo: 'affermazione_vietata', dettaglio: p });
  }
  return { ok: violazioni.length === 0, violazioni };
}
