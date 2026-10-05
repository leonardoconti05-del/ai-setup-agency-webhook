// lib/engine/entities.js
//
// Estrazione deterministica (zero costo LLM) delle entità: lessico di
// settore + entità generiche italiane (giorno, fascia oraria, nome).
// Produce valori NORMALIZZATI (canonici): "pulizia dei denti" -> servizio =
// igiene_dentale. L'estrazione LLM (lib/engine/analisi-llm.js) la completa
// per ciò che le regole non coprono; in caso di conflitto sui valori
// canonici vince il lessico (è la fonte di verità del settore).

import { normalizza, contieneFrase } from './text.js';

const GIORNI = {
  lunedi: 'lunedi', martedi: 'martedi', mercoledi: 'mercoledi', giovedi: 'giovedi',
  venerdi: 'venerdi', sabato: 'sabato', domenica: 'domenica',
  oggi: 'oggi', domani: 'domani', dopodomani: 'dopodomani',
};

const FASCE = [
  ['mattina', ['mattina', 'mattino', 'stamattina', 'di mattina']],
  ['pomeriggio', ['pomeriggio', 'dopo pranzo']],
  ['sera', ['sera', 'stasera', 'serata']],
];

// Parole che seguono "sono" ma NON sono nomi ("sono preoccupato").
const NON_NOMI = new Set([
  'preoccupato', 'preoccupata', 'qui', 'li', 'in', 'a', 'da', 'di', 'un', 'una', 'il', 'la', 'non', 'stato', 'stata',
  'interessato', 'interessata', 'nuovo', 'nuova', 'cliente', 'paziente', 'mamma', 'papa', 'il', 'sicuro', 'sicura',
  'ancora', 'gia', 'contento', 'contenta', 'disponibile', 'libero', 'libera', 'impegnato', 'impegnata', 'arrabbiato', 'arrabbiata',
  'ok', 'pronto', 'pronta', 'qua', 'fuori', 'tornato', 'tornata', 'felice', 'stanco', 'stanca', 'stufo', 'stufa',
]);

// Parole che a inizio frase seguite da virgola NON sono un nome ("Ciao, ...").
const APERTURE = new Set(['ciao', 'salve', 'buongiorno', 'buonasera', 'buonpomeriggio', 'grazie', 'si', 'no', 'ok', 'perfetto', 'allora', 'senta', 'scusi', 'scusa', 'dunque', 'anzi', 'infatti', 'beh', 'ehi', 'hey', 'prego', 'certo', 'ottimo', 'bene', 'urgente']);

function estraiNome(testoOriginale, indice) {
  const t = String(testoOriginale ?? '');
  // "mi chiamo Marco Rossi" / "il mio nome è Marco" — nome in qualunque forma
  let m = t.match(/\bmi chiamo\s+([A-Za-zÀ-ÿ'’]{2,20}(?:\s+[A-Za-zÀ-ÿ'’]{2,20})?)/i);
  if (!m) m = t.match(/\b(?:[Ii]l mio nome (?:è|e'|e)|[Ss]ono)\s+([A-ZÀ-Ý][a-zà-ÿ'’]{1,19}(?:\s+[A-ZÀ-Ý][a-zà-ÿ'’]{1,19})?)/);
  if (!m) {
    // Nome "nudo" a inizio messaggio: "Alessandro, sbiancamento giovedì sera".
    // Solo se non è una parola di apertura né un termine del lessico di settore
    // ("Pulizia, per favore" non è un nome).
    const nudo = t.match(/^\s*([A-ZÀ-Ý][a-zà-ÿ'’]{2,19})\s*,/);
    if (nudo) {
      const n = normalizza(nudo[1]);
      const nelLessico = indice?.lessico?.some((v) => v.forme.some((f) => contieneFrase(n, f)));
      if (!APERTURE.has(n) && !nelLessico && !(n in GIORNI)) return nudo[1];
    }
    return null;
  }
  const primo = normalizza(m[1].split(/\s+/)[0]);
  if (NON_NOMI.has(primo)) return null;
  return m[1].trim().replace(/\s+/g, ' ').split(' ').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// pack.lexicon: [{ canonical, entity, value, synonyms[], abbreviations[], slang[], errors[] }]
// Restituisce { entities, concepts } dove concepts elenca i termini canonici
// riconosciuti (anche senza entità collegata) — utili a intent e FAQ.
export function estraiEntitaDeterministiche(testo, indice, { nomeEntita = 'nome' } = {}) {
  const norm = normalizza(testo);
  const entities = {};
  const concepts = [];

  for (const voce of indice.lessico) {
    const trovato = voce.forme.some((forma) => contieneFrase(norm, forma, { negazione: voce.negabile, fuzzy: true }));
    if (!trovato) continue;
    concepts.push(voce.canonical);
    if (voce.entity && voce.value !== undefined && entities[voce.entity] === undefined) {
      entities[voce.entity] = voce.value;
    }
  }

  const giorni = Object.keys(GIORNI).filter((g) => contieneFrase(norm, g));
  if (giorni.length > 0) entities.giorno = GIORNI[giorni[0]];

  for (const [valore, forme] of FASCE) {
    if (forme.some((f) => contieneFrase(norm, f))) { entities.fascia_oraria = valore; break; }
  }

  const nome = estraiNome(testo, indice);
  if (nome) entities[nomeEntita] = nome;

  return { entities, concepts };
}
