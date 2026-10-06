import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sommaCostoAI, costoAI } from '../lib/costo-ai.js';

test('somma costo, conta risposte e quelle senza LLM', () => {
  const r = sommaCostoAI([{ dettaglio: { costo_usd: 0.005 } }, { dettaglio: { costo_usd: 0.0025 } }, { dettaglio: { costo_usd: 0 } }, { dettaglio: null }]);
  assert.deepEqual(r, { costo_usd: 0.0075, risposte: 3, senza_llm: 1 });
});
test('input non valido → null; errore di rete → null', async () => {
  assert.equal(sommaCostoAI(undefined), null);
  assert.equal(await costoAI({ SUPABASE_URL: 'https://x', headers: {}, fetchImpl: async () => { throw new Error('x'); } }, 'c1'), null);
  assert.equal(await costoAI({ SUPABASE_URL: 'https://x', headers: {}, fetchImpl: async () => ({ ok: false }) }, 'c1'), null);
});
