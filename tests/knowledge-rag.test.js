import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ricercaKnowledgeBase, valutaRetrieval } from '../lib/knowledge-rag.js';

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('Knowledge RAG', () => {
  test('retrieval uses the supplied tenant and threshold', async () => {
    let body;
    const result = await ricercaKnowledgeBase({
      SUPABASE_URL: 'https://example.supabase.co',
      headers: { Authorization: 'Bearer test' },
      cliente_id: 'tenant-a',
      domanda: 'Quanto costa?',
      embedQueryImpl: async () => [0.1, 0.2, 0.3],
      fetchImpl: async (url, opts) => {
        assert.match(url, /match_knowledge_chunks$/);
        body = JSON.parse(opts.body);
        return response([
          { id: 'high', contenuto: 'Costa 100 euro.', similarity: 0.81 },
          { id: 'low', contenuto: 'Altro dato.', similarity: 0.31 },
        ]);
      },
    });
    assert.equal(body.p_cliente_id, 'tenant-a');
    assert.equal(result.status, 'ok');
    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0].id, 'high');
    assert.equal(result.topSimilarity, 0.81);
    assert.match(result.contesto, /100 euro/);
  });

  test('RPC failure returns empty context and an error status', async () => {
    const result = await ricercaKnowledgeBase({
      SUPABASE_URL: 'https://example.supabase.co',
      headers: {},
      cliente_id: 'tenant-a',
      domanda: 'domanda',
      embedQueryImpl: async () => [1, 2, 3],
      fetchImpl: async () => response({ error: 'failure' }, 503),
    });
    assert.equal(result.status, 'error');
    assert.deepEqual(result.hits, []);
    assert.equal(result.contesto, '');
  });

  test('evaluation checks the expected phrase against retrieved content', () => {
    const hits = [{ id: '1', similarity: 0.91, contenuto: 'Il trattamento costa 100 euro.' }];
    assert.equal(valutaRetrieval(hits, '100 euro').passed, true);
    assert.equal(valutaRetrieval(hits, '500 euro').passed, false);
    assert.equal(valutaRetrieval([], '').passed, false);
  });
});
