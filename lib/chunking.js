// lib/chunking.js
//
// Spezza un testo lungo in chunk di dimensione gestibile per l'embedding e
// per il retrieval (chunk troppo grandi = meno precisione nella ricerca;
// chunk troppo piccoli = contesto insufficiente per Claude). Approccio
// semplice e deterministico: unisce i paragrafi (separati da riga vuota)
// finché non si supera MAX_CARATTERI, poi apre un nuovo chunk. Un singolo
// paragrafo più lungo del limite viene comunque tagliato per non produrre
// un chunk enorme.
//
// Nessun overlap tra chunk in questa prima versione (semplicità prima di
// tutto) — se in futuro il retrieval risultasse impreciso sui bordi tra
// due paragrafi, aggiungere un piccolo overlap (es. 100-150 caratteri) è
// il miglioramento naturale successivo.

const MAX_CARATTERI = 1200;

export function spezzaInChunk(testo) {
  const paragrafi = String(testo || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunk = [];
  let corrente = '';

  for (const paragrafo of paragrafi) {
    const pezzo = paragrafo.length > MAX_CARATTERI
      ? paragrafo.match(new RegExp(`.{1,${MAX_CARATTERI}}`, 'g')) || []
      : [paragrafo];

    for (const p of pezzo) {
      if (corrente && (corrente.length + p.length + 2) > MAX_CARATTERI) {
        chunk.push(corrente);
        corrente = p;
      } else {
        corrente = corrente ? `${corrente}\n\n${p}` : p;
      }
    }
  }
  if (corrente) chunk.push(corrente);

  return chunk;
}
