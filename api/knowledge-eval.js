// api/knowledge-eval.js
// Protected retrieval evaluation endpoint for the tenant's Knowledge Base.
// It is intentionally separate from the customer-facing WhatsApp flow:
// evaluation requires a human-supplied expected phrase and never changes
// production customer state.

import { leggiCookieSessione, verificaSessione } from '../lib/session.js';
import { ricercaKnowledgeBase, valutaRetrieval } from '../lib/knowledge-rag.js';
import { creaRequestId, logEvento } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non permesso' });
  }

  const SESSION_SECRET = process.env.SESSION_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SESSION_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Configurazione server incompleta' });
  }

  const sessione = verificaSessione(leggiCookieSessione(req), SESSION_SECRET);
  if (!sessione?.cliente_id) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const { query, expected_phrase: expectedPhrase = '' } = req.body || {};
  if (!String(query || '').trim()) {
    return res.status(400).json({ error: 'query obbligatoria' });
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
  const requestId = creaRequestId();

  const retrieval = await ricercaKnowledgeBase({
    SUPABASE_URL,
    headers,
    cliente_id: sessione.cliente_id,
    domanda: String(query),
  });

  const evaluation = valutaRetrieval(retrieval.hits, expectedPhrase);

  await logEvento({
    SUPABASE_URL,
    headers,
    requestId,
    clienteId: sessione.cliente_id,
    fase: 'knowledge_evaluation',
    stato: retrieval.status === 'error' ? 'errore' : evaluation.passed ? 'ok' : 'fallito',
    dettaglio: {
      query: String(query).slice(0, 500),
      expected_phrase: evaluation.expected_phrase,
      passed: evaluation.passed,
      topSimilarity: evaluation.top_similarity,
      hitCount: evaluation.hit_count,
      hits: retrieval.hits.map((h) => ({ id: h.id, similarity: h.similarity })),
      retrievalStatus: retrieval.status,
      retrievalError: retrieval.error || null,
    },
  });

  return res.status(200).json({
    request_id: requestId,
    cliente_id: sessione.cliente_id,
    retrieval: {
      status: retrieval.status,
      top_similarity: retrieval.topSimilarity,
      hit_count: retrieval.hits.length,
      hits: retrieval.hits,
    },
    evaluation,
  });
}
