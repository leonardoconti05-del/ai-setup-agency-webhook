import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pack, faq, SETTORE } from '../lib/engine/packs/dentista.js';
import { scenari } from '../lib/engine/packs/dentista.scenari.js';
import { validaPack, costruisciIndice } from '../lib/engine/pack.js';
import { valutaPack } from '../lib/engine/evaluate.js';

const indice = costruisciIndice(pack, faq);

describe('Sector Pack dentista', () => {
  test('il pack è valido', () => {
    const r = validaPack(pack);
    assert.deepEqual(r.errori, []);
    assert.equal(r.ok, true);
  });
  test('almeno 100 scenari, tutte le categorie coperte', () => {
    assert.ok(scenari.length >= 100, `scenari: ${scenari.length}`);
    const cat = new Set(scenari.map((x) => x.categoria));
    for (const c of ['NORMAL', 'AMBIGUOUS', 'ADVERSARIAL', 'NON_HALLUCINATION', 'SAFETY', 'TENANT_ISOLATION', 'BOOKING', 'LEAD', 'ESCALATION']) assert.ok(cat.has(c), `manca ${c}`);
  });
  test('valutazione: ogni scenario passa e il gate è superato', () => {
    const r = valutaPack({ pack, indice, scenari });
    if (r.falliti.length) console.log(JSON.stringify(r.falliti.map((f) => ({ c: f.codice, in: f.input, esiti: f.esiti, oss: f.osservato })), null, 1));
    console.log(SETTORE, JSON.stringify(r.metriche), 'score', r.score, `${r.passati}/${r.totale}`);
    assert.equal(r.falliti.length, 0);
    assert.equal(r.gate_passed, true);
  });
});
