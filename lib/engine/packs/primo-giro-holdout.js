// lib/engine/packs/primo-giro-holdout.js
//
// DATO UFFICIALE di generalizzazione di ogni pack: risultato del PRIMO giro dell'holdout
// (formulazioni scritte dopo aver congelato il pack, prima di qualunque correzione).
// Il risultato "dopo i fix" NON è una prova di generalizzazione e qui non compare.
// Fonti: tabella in docs/SECTOR_ENGINE.md (10 settori storici) e commento di testa di ogni
// <settore>.holdout.js. Avvocato: pack invariato dopo il congelamento (md5 verificato), misurato il 7/10/2026.
// Un test controlla che `totale` coincida con il numero di scenari dell'holdout.
export const PRIMO_GIRO_HOLDOUT = {
  dentista: { passati: 29, totale: 40 },
  parrucchiere: { passati: 37, totale: 57 },
  estetista: { passati: 45, totale: 50 },
  elettricista: { passati: 23, totale: 37 },
  autofficina: { passati: 27, totale: 34 },
  veterinario: { passati: 38, totale: 44 },
  fisioterapista: { passati: 28, totale: 34 },
  ristorante: { passati: 33, totale: 40 },
  bar_caffetteria: { passati: 23, totale: 28 },
  immobiliare: { passati: 27, totale: 32 },
  agenzia_web_grafica: { passati: 30, totale: 66 },
  amministratore_condominio: { passati: 46, totale: 62 },
  carrozzeria: { passati: 51, totale: 68 },
  centro_corsi: { passati: 41, totale: 72 },
  commercialista: { passati: 41, totale: 60 },
  consulente: { passati: 37, totale: 60 },
  fabbro: { passati: 35, totale: 44 },
  fotografo_videomaker: { passati: 51, totale: 72 },
  giardiniere: { passati: 33, totale: 49 },
  gommista: { passati: 26, totale: 48 },
  imbianchino: { passati: 34, totale: 46 },
  medico: { passati: 47, totale: 60 },
  noleggio: { passati: 56, totale: 79 },
  organizzazione_eventi: { passati: 39, totale: 52 },
  palestra_personal_trainer: { passati: 43, totale: 56 },
  pulizie: { passati: 27, totale: 45 },
  scuola_guida: { passati: 33, totale: 53 },
  traslochi: { passati: 33, totale: 54 },
  avvocato: { passati: 47, totale: 73 },
};
