import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validaPack, costruisciIndice } from '../lib/engine/pack.js';
import { valutaPack } from '../lib/engine/evaluate.js';
import { analisiDeterministica } from '../lib/engine/run.js';

import { SETTORI_DISPONIBILI as SETTORI } from '../lib/engine/packs/registro.js';
const CATEGORIE = ['NORMAL', 'AMBIGUOUS', 'ADVERSARIAL', 'NON_HALLUCINATION', 'SAFETY', 'TENANT_ISOLATION', 'BOOKING', 'LEAD', 'ESCALATION'];

// Caricamento PRIMA dei describe (top-level await): con describe asincroni node può
// chiudere la suite prima che i test dei settori successivi siano registrati.
const definizioni = {};
for (const s of SETTORI) {
  definizioni[s] = { ...(await import(`../lib/engine/packs/${s}.js`)), ...(await import(`../lib/engine/packs/${s}.scenari.js`)) };
}

test('il registro contiene un pack per ogni settore di lib/settori.js', async () => {
  const { SETTORI: mappa } = await import('../lib/settori.js');
  assert.deepEqual([...SETTORI].sort(), Object.keys(mappa).sort());
});

for (const s of SETTORI) {
  describe(`Sector Pack ${s}`, () => {
    const { pack, faq, SETTORE, scenari } = definizioni[s];
    test('valido, con identificativo coerente', () => {
      assert.deepEqual(validaPack(pack).errori, []);
      assert.equal(SETTORE, s);
    });
    test('≥50 scenari, tutte le 9 categorie, codici univoci', () => {
      assert.ok(scenari.length >= 50);
      const cat = new Set(scenari.map((x) => x.categoria));
      for (const c of CATEGORIE) assert.ok(cat.has(c), `manca ${c}`);
      assert.equal(new Set(scenari.map((x) => x.codice)).size, scenari.length);
    });
    test('le FAQ di settore non contengono importi né orari (sono dati del tenant)', () => {
      for (const f of faq) assert.doesNotMatch(f.risposta_base, /€|\beuro\b|\b\d{1,2}[:.]\d{2}\b/i, f.domanda_canonica);
    });
    test('gate di valutazione superato', () => {
      const r = valutaPack({ pack, indice: costruisciIndice(pack, faq), scenari });
      assert.equal(r.falliti.length, 0, JSON.stringify(r.falliti.slice(0, 3).map((f) => f.codice)));
      assert.equal(r.gate_passed, true);
    });
    test('latenza deterministica per messaggio < 50 ms', () => {
      const indice = costruisciIndice(pack, faq);
      analisiDeterministica({ messaggio: 'ciao', pack, indice });
      const t = performance.now();
      for (let i = 0; i < 20; i++) analisiDeterministica({ messaggio: 'vorrei prenotare per domani mattina, mi chiamo Sara', pack, indice });
      assert.ok((performance.now() - t) / 20 < 50, `${((performance.now() - t) / 20).toFixed(1)} ms`);
    });
  });
}
