import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pubblicaPack } from '../lib/engine/pubblica.js';
import { SETTORI_DISPONIBILI } from '../lib/engine/packs/registro.js';

function finto({ esistente = null } = {}) {
  const chiamate = [];
  const fetchImpl = async (url, o = {}) => {
    const m = o.method || 'GET';
    chiamate.push({ m, url });
    let corpo = '';
    if (m === 'GET') corpo = JSON.stringify(esistente ? [esistente] : []);
    if (m === 'POST' && url.includes('sector_profiles')) corpo = JSON.stringify([{ id: 'p1' }]);
    return { ok: true, status: 200, text: async () => corpo };
  };
  return { chiamate, ctx: { SUPABASE_URL: 'https://x', headers: {}, fetchImpl } };
}

test('registro: 10 settori', () => assert.equal(SETTORI_DISPONIBILI.length, 10));
test('settore sconosciuto → errore, nessuna chiamata', async () => {
  const { ctx, chiamate } = finto();
  assert.equal((await pubblicaPack(ctx, '../etc/passwd')).ok, false);
  assert.equal(chiamate.length, 0);
});
test('nuovo settore: crea profilo, FAQ, valutazione; senza promuovi non promuove', async () => {
  const { ctx, chiamate } = finto();
  const r = await pubblicaPack(ctx, 'ristorante');
  assert.equal(r.ok, true); assert.equal(r.gate_passed, true); assert.equal(r.profilo, 'creato (test)'); assert.equal(r.promosso, undefined);
  assert.ok(chiamate.some((c) => c.m === 'POST' && c.url.includes('sector_eval_runs')));
  assert.ok(!chiamate.some((c) => c.m === 'PATCH'));
});
test('promuovi: PATCH a production su profilo e FAQ', async () => {
  const { ctx, chiamate } = finto();
  const r = await pubblicaPack(ctx, 'ristorante', { promuovi: true });
  assert.equal(r.promosso, true);
  assert.equal(chiamate.filter((c) => c.m === 'PATCH').length, 2);
});
test('profilo già in produzione: non sovrascritto, FAQ e valutazione intatte', async () => {
  const { ctx, chiamate } = finto({ esistente: { id: 'p9', status: 'production' } });
  const r = await pubblicaPack(ctx, 'dentista');
  assert.match(r.profilo, /già production/);
  assert.ok(!chiamate.some((c) => c.m === 'DELETE' || c.m === 'POST' || c.m === 'PATCH'));
});
