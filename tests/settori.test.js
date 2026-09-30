import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etichetteSettore, nomeSettore, inizialiSettore, coloreSettore, SETTORI } from '../lib/settori.js';

test('etichetteSettore', async (t) => {
  await t.test('restituisce le etichette specifiche per un settore noto', () => {
    const e = etichetteSettore('dentista');
    assert.equal(e.cliente, 'Paziente');
    assert.equal(e.evento, 'Visita');
  });

  await t.test('restituisce un default sensato per un settore sconosciuto', () => {
    const e = etichetteSettore('settore_mai_visto');
    assert.equal(e.cliente, 'Cliente');
    assert.ok(e.nome);
  });

  await t.test('non esplode con settore null/undefined', () => {
    assert.doesNotThrow(() => etichetteSettore(null));
    assert.doesNotThrow(() => etichetteSettore(undefined));
  });
});

test('nomeSettore', async (t) => {
  await t.test('usa il nome scritto a mano per un settore mappato', () => {
    assert.equal(nomeSettore('agenzia_web_grafica'), 'Agenzia Web & Grafica');
    assert.equal(nomeSettore('dentista'), 'Studio Dentistico');
  });

  await t.test('deriva un\'etichetta leggibile per un settore non mappato', () => {
    assert.equal(nomeSettore('qualcosa_di_nuovo'), 'Qualcosa Di Nuovo');
  });

  await t.test('gestisce valori vuoti', () => {
    assert.equal(nomeSettore(''), 'Altro');
    assert.equal(nomeSettore(null), 'Altro');
  });
});

test('inizialiSettore', async (t) => {
  await t.test('restituisce due lettere maiuscole da un nome a più parole', () => {
    assert.equal(inizialiSettore('dentista'), 'SD'); // Studio Dentistico
  });

  await t.test('non esplode con settore sconosciuto', () => {
    assert.doesNotThrow(() => inizialiSettore('boh'));
  });
});

test('coloreSettore', async (t) => {
  await t.test('è deterministico: stesso settore, stesso colore', () => {
    assert.equal(coloreSettore('dentista'), coloreSettore('dentista'));
  });

  await t.test('settori diversi hanno colori diversi', () => {
    assert.notEqual(coloreSettore('dentista'), coloreSettore('avvocato'));
  });

  await t.test('non esplode con settore sconosciuto/null', () => {
    assert.doesNotThrow(() => coloreSettore(null));
    assert.doesNotThrow(() => coloreSettore('mai_visto'));
  });

  await t.test('tutti i settori mappati hanno un nome', () => {
    for (const chiave of Object.keys(SETTORI)) {
      assert.ok(SETTORI[chiave].nome, `settore ${chiave} senza nome`);
    }
  });
});
