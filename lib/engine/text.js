// lib/engine/text.js
//
// Normalizzazione del linguaggio naturale italiano di WhatsApp: minuscole,
// niente accenti, punteggiatura ed emoji ridotte a spazi. Tutto il motore
// (lessico, intent, sicurezza) ragiona su testo normalizzato, così
// "Pulizia dei denti!!", "pulizia  dei denti 🦷" e "PULIZIA DEI DENTI"
// diventano lo stesso testo.

export function normalizza(testo) {
  return String(testo ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(testoNorm) {
  return testoNorm ? testoNorm.split(' ').filter(Boolean) : [];
}

// Distanza di Levenshtein limitata a `max`: serve a tollerare un refuso
// ("sbiancamneto") senza trasformare il confronto in una ricerca fuzzy
// generalizzata, che produrrebbe falsi positivi.
export function distanzaMax(a, b, max = 1) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let corrente = [i];
    let minRiga = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      corrente[j] = Math.min(prev[j] + 1, corrente[j - 1] + 1, prev[j - 1] + costo);
      if (corrente[j] < minRiga) minRiga = corrente[j];
    }
    if (minRiga > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = corrente[j];
  }
  return prev[b.length];
}

const NEGAZIONI = new Set(['non', 'senza', 'niente', 'nessun', 'nessuna', 'mai']);

// True se `frase` (già normalizzata) compare in `testoNorm` su confini di
// parola. Con { negazione: true } ignora le occorrenze precedute da una
// negazione nelle 2 parole prima ("non ho dolore" non è "ho dolore").
// Con { fuzzy: true } tollera un refuso (distanza 1) sulle parole singole
// lunghe almeno 6 caratteri.
export function contieneFrase(testoNorm, frase, { negazione = false, fuzzy = false } = {}) {
  if (!testoNorm || !frase) return false;
  const t = tokens(testoNorm);
  const f = tokens(frase);
  if (f.length === 0) return false;
  for (let i = 0; i + f.length <= t.length; i++) {
    let ok = true;
    for (let j = 0; j < f.length; j++) {
      const a = t[i + j];
      const b = f[j];
      if (a === b) continue;
      if (fuzzy && b.length >= 6 && a.length >= 5 && distanzaMax(a, b, 1) <= 1) continue;
      ok = false;
      break;
    }
    if (!ok) continue;
    if (negazione) {
      const prima = t.slice(Math.max(0, i - 2), i);
      if (prima.some((p) => NEGAZIONI.has(p))) continue;
    }
    return true;
  }
  return false;
}
