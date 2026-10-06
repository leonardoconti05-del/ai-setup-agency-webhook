import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chiaveDomanda, tipoLacuna, registraLacuna } from '../lib/lacune.js';

test('chiave: stessa domanda scritta in modi diversi → stessa chiave', () => {
  assert.equal(chiaveDomanda('Fate  le Faccette??'), chiaveDomanda('fate le faccette'));
  assert.equal(chiaveDomanda('   '), '');
});
test('tipoLacuna', () => {
  assert.equal(tipoLacuna({ action: 'answer_information', reason: 'informazione' }), 'informazione');
  assert.equal(tipoLacuna({ action: 'answer_information', reason: 'faq' }), null);
  assert.equal(tipoLacuna({ action: 'human_handoff', reason: 'non_compreso' }), 'non_compreso');
  assert.equal(tipoLacuna({ action: 'propose_slot', reason: 'x' }), null);
});
test('registra: nuova → POST; esistente → PATCH con volte+1; errore → false senza eccezioni', async () => {
  const chiamate = [];
  const mk = (esistenti) => async (url, o = {}) => { chiamate.push({ url, m: o.method || 'GET', b: o.body }); return { json: async () => esistenti }; };
  const base = { SUPABASE_URL: 'https://x', headers: {} };
  assert.equal(await registraLacuna({ ...base, fetchImpl: mk([]) }, { cliente_id: 'c1', domanda: 'Fate le faccette?', tipo: 'informazione' }), true);
  assert.equal(chiamate.at(-1).m, 'POST');
  assert.equal(await registraLacuna({ ...base, fetchImpl: mk([{ id: 5, volte: 2 }]) }, { cliente_id: 'c1', domanda: 'Fate le faccette?', tipo: 'informazione' }), true);
  assert.equal(chiamate.at(-1).m, 'PATCH');
  assert.equal(JSON.parse(chiamate.at(-1).b).volte, 3);
  assert.equal(await registraLacuna({ ...base, fetchImpl: async () => { throw new Error('rete'); } }, { cliente_id: 'c1', domanda: 'x', tipo: 'informazione' }), false);
});
