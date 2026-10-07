// lib/knowledge-rag.js
// Centralized tenant-scoped RAG retrieval and retrieval evaluation helpers.
// The caller supplies server-side Supabase credentials and the authoritative
// tenant id; the model never controls tenant scope.

import { embedQuery } from './embeddings.js';

export const DEFAULT_RAG_THRESHOLD = 0.5;
export const DEFAULT_RAG_MATCH_COUNT = 4;

export function valutaRetrieval(hits, expectedPhrase = '') {
  const normalizedExpected = String(expectedPhrase || '').trim().toLocaleLowerCase('it-IT');
  const context = Array.isArray(hits) ? hits.map((h) => String(h.contenuto || '')).join('\n') : '';
  const passed = normalizedExpected ? context.toLocaleLowerCase('it-IT').includes(normalizedExpected) : Array.isArray(hits) && hits.length > 0;
  return {
    passed,
    expected_phrase: normalizedExpected || null,
    top_similarity: Array.isArray(hits) && hits.length > 0 ? Number(hits[0].similarity) : null,
    hit_count: Array.isArray(hits) ? hits.length : 0,
  };
}

export async function ricercaKnowledgeBase({
  SUPABASE_URL,
  headers,
  cliente_id,
  domanda,
  fetchImpl = fetch,
  embedQueryImpl = embedQuery,
  matchCount = DEFAULT_RAG_MATCH_COUNT,
  threshold = DEFAULT_RAG_THRESHOLD,
}) {
  if (!SUPABASE_URL || !headers || !cliente_id || !String(domanda || '').trim()) {
    return { status: 'invalid_input', contesto: '', hits: [], topSimilarity: null };
  }

  try {
    const embedding = await embedQueryImpl(String(domanda));
    const res = await fetchImpl(`${SUPABASE_URL}/rest/v1/rpc/match_knowledge_chunks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_cliente_id: cliente_id,
        p_query_embedding: embedding,
        p_match_count: matchCount,
      }),
    });

    const rows = await res.json();
    if (!res.ok) {
      throw new Error(`Retrieval RPC fallita (${res.status}): ${JSON.stringify(rows).slice(0, 300)}`);
    }

    const candidates = Array.isArray(rows) ? rows : [];
    const hits = candidates.filter(
      (c) => typeof c.similarity === 'number' && c.similarity >= threshold && c.contenuto
    );

    return {
      status: 'ok',
      contesto: hits.map((c) => `- ${c.contenuto}`).join('\n'),
      hits: hits.map((c) => ({
        id: c.id,
        similarity: Number(c.similarity),
        contenuto: c.contenuto,
      })),
      topSimilarity: hits.length > 0 ? Number(hits[0].similarity) : null,
    };
  } catch (error) {
    return {
      status: 'error',
      contesto: '',
      hits: [],
      topSimilarity: null,
      error: String(error?.message || error),
    };
  }
}
