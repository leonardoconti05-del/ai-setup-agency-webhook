import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etichetteSettore, nomeSettore } from '../lib/settori.js';

test('etichetteSettore', async (t) => {
  await t.test('restituisce le etichette specifiche per un settore noto', () => {
    const e = etichetteSettore('dentista');
    assert.equal(e.cliente, 'Paziente');
    assert.equal(e.evento, 'Visita');
  });

  await t.test('restituisce un default sensato per un settore sconosciuto', () => {
    const e = etichetteSettore('settore_mai_visto');
    assert.equal(e.cliente, 'Cliente');
    assert.ok(e.icona);
  });

  await t.test('non esplode con settore null/undefined', () => {
    assert.doesNotThrow(() => etichetteSettore(null));
    assert.doesNotThrow(() => etichetteSettore(undefined));
  });
});

test('nomeSettore', async (t) => {
  await t.test('capitalizza e sostituisce gli underscore', () => {
    assert.equal(nomeSettore('agenzia_web_grafica'), 'Agenzia Web Grafica');
    assert.equal(nomeSettore('dentista'), 'Dentista');
  });

  await t.test('gestisce valori vuoti', () => {
    assert.equal(nomeSettore(''), 'Altro');
    assert.equal(nomeSettore(null), 'Altro');
  });
});
