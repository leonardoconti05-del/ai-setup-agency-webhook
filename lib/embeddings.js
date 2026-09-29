// lib/embeddings.js
//
// Embedding via Voyage AI (https://docs.voyageai.com/docs/embeddings).
// Claude/Anthropic non espone un'API di embedding propria: Voyage AI è il
// provider raccomandato da Anthropic per questo scopo, e le sue API si
// chiamano con una semplice fetch, senza SDK — coerente con il resto del
// progetto (Supabase, Telegram, Google Calendar sono già chiamati così).
//
// Modello scelto: voyage-4-lite, con output_dimension fissato esplicitamente
// a 1024 (deve combaciare con la colonna `vector(1024)` in Supabase — se si
// cambia modello o dimensione, aggiornare anche migrations/005_knowledge_base.sql
// e rigenerare tutti i chunk esistenti).
//
// input_type "document" per i testi caricati (chunk indicizzati),
// "query" per la domanda del cliente WhatsApp al momento della ricerca:
// Voyage ottimizza l'embedding in modo leggermente diverso a seconda del
// ruolo, e usare il tipo giusto migliora la qualità del retrieval.

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const MODELLO = 'voyage-4-lite';
const DIMENSIONE = 1024;

async function chiamaVoyage(input, inputType) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('VOYAGE_API_KEY non configurata su questo deploy.');

  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input,
      model: MODELLO,
      input_type: inputType,
      output_dimension: DIMENSIONE,
    }),
  });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data.data)) {
    throw new Error('Errore API Voyage: ' + JSON.stringify(data));
  }
  return data.data.map((d) => d.embedding);
}

// testi: array di stringhe (i chunk di un documento). Ritorna un array di
// embedding nello stesso ordine.
export async function embedDocumenti(testi) {
  if (!Array.isArray(testi) || testi.length === 0) return [];
  return chiamaVoyage(testi, 'document');
}

// Un solo embedding per la domanda del cliente.
export async function embedQuery(testo) {
  const risultati = await chiamaVoyage([testo], 'query');
  return risultati[0];
}
