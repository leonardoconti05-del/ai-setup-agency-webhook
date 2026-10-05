// lib/engine/intent.js
//
// Classificazione deterministica dell'intento, a costo zero. L'LLM interviene
// solo se la confidenza è sotto soglia (vedi run.js pianifica). Punteggio:
//  - frase d'esempio contenuta nel messaggio  -> 0.90
//  - sovrapposizione di parole con un esempio  -> fino a 0.80
//  - parole chiave                              -> 0.55 la prima, +0.12 ciascuna
//  - concetto di lessico collegato all'intent   -> 0.60
// Intent con `solo_isolato: true` (saluti, "grazie") contano solo in messaggi
// brevissimi: "ciao vorrei prenotare" è una prenotazione, non un saluto.
//
// Messaggi MULTI-INTENT ("quanto costa e avete posto venerdì?"): due intent
// forti non sono ambiguità, sono due richieste. L'intent primario è quello con
// punteggio più alto (a parità, priorità più bassa nel pack); gli altri forti
// finiscono in `secondari` e il piano di risposta li affronta entrambi.
// La penalità di ambiguità scatta solo se i due migliori sono DEBOLI.

import { tokens, contieneFrase } from './text.js';

// Parole funzionali: non contano nel confronto per sovrapposizione, altrimenti
// "chi mi visita" sembrerebbe presente in "prima visita sabato mattina".
const STOPWORD = new Set(['mi', 'ti', 'si', 'ci', 'vi', 'un', 'una', 'uno', 'il', 'lo', 'la', 'i', 'gli', 'le', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'o', 'ma', 'che', 'chi', 'cosa', 'come', 'ho', 'ha', 'hai', 'sono', 'e', 'del', 'della', 'dei', 'delle', 'al', 'alla', 'ai', 'alle', 'non', 'se', 'ne', 'ma', 'anche', 'poi']);

const SOGLIA_FORTE = 0.7;

export function rilevaIntento(testoNorm, indice, concepts = [], entities = {}) {
  const tk = new Set(tokens(testoNorm));
  const nTokens = tk.size;
  const punteggi = {};

  for (const intent of indice.intents) {
    if (intent.solo_isolato && nTokens > 3) { punteggi[intent.id] = 0; continue; }
    let best = 0;
    for (const es of intent.esempiNorm) {
      if (contieneFrase(testoNorm, es, { fuzzy: true })) { best = Math.max(best, 0.9); continue; }
      const et = tokens(es).filter((w) => !STOPWORD.has(w));
      if (et.length < 2) continue;
      const comuni = et.filter((w) => tk.has(w)).length;
      const copertura = comuni / et.length;
      if (comuni >= 2 && copertura >= 0.7) best = Math.max(best, 0.4 + 0.4 * copertura);
    }
    // Combinazioni: "vorrei" + un servizio, o un servizio + un giorno => la
    // richiesta è implicita ("vorrei una pulizia" è una prenotazione).
    for (const c of intent.combinazioni || []) {
      if (entities[c.entity] === undefined) continue;
      // Se il messaggio parla di preventivo/prezzo, la richiesta implicita di prenotare non vale.
      if ((c.non_con_concepts || []).some((x) => concepts.includes(x))) continue;
      const verbo = (c.conNorm || []).some((v) => contieneFrase(testoNorm, v));
      const entita = (c.con_entities || []).some((e) => entities[e] !== undefined);
      if (verbo || entita) best = Math.max(best, c.score ?? 0.8);
    }
    let kw = 0;
    for (const k of intent.keywordsNorm) if (contieneFrase(testoNorm, k, { fuzzy: true })) kw++;
    if (kw > 0) best = Math.max(best, Math.min(0.85, 0.55 + 0.12 * (kw - 1)));
    for (const c of concepts) {
      const voce = indice.lessico.find((v) => v.canonical === c && v.intent === intent.id);
      if (voce) best = Math.max(best, 0.6);
    }
    punteggi[intent.id] = best;
  }

  const prio = (id) => indice.intents.find((i) => i.id === id)?.priorita ?? 50;
  const ordinati = Object.entries(punteggi).sort((a, b) => b[1] - a[1] || prio(a[0]) - prio(b[0]));
  const [idMigliore, migliore] = ordinati[0] || [null, 0];
  const secondo = ordinati[1]?.[1] ?? 0;
  if (!idMigliore || migliore === 0) return { intent: 'unknown', confidence: 0, secondari: [], punteggi };

  let confidence = migliore;
  if (migliore < SOGLIA_FORTE && secondo >= migliore - 0.1 && secondo > 0) confidence -= 0.15;
  const secondari = ordinati.slice(1).filter(([, s]) => s >= SOGLIA_FORTE && migliore >= SOGLIA_FORTE).map(([id]) => id);
  return { intent: idMigliore, confidence: Math.max(0, Math.round(confidence * 100) / 100), secondari, punteggi };
}

export function trovaFaq(testoNorm, indice) {
  let migliore = null;
  let score = 0;
  const tk = new Set(tokens(testoNorm));
  for (const f of indice.faq) {
    for (const v of f.variantiNorm) {
      let s = 0;
      if (contieneFrase(testoNorm, v)) s = 1;
      else {
        const vt = tokens(v);
        if (vt.length >= 2) {
          const comuni = vt.filter((w) => tk.has(w)).length;
          const jacc = comuni / new Set([...vt, ...tk]).size;
          s = jacc >= 0.5 ? jacc : 0;
        }
      }
      if (s > score) { score = s; migliore = f; }
    }
  }
  return score >= 0.5 ? { faq: migliore, score } : null;
}
