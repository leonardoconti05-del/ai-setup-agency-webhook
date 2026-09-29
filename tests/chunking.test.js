import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spezzaInChunk } from '../lib/chunking.js';

describe('spezzaInChunk', () => {
  test('testo vuoto produce nessun chunk', () => {
    assert.deepEqual(spezzaInChunk(''), []);
    assert.deepEqual(spezzaInChunk(null), []);
  });

  test('un testo corto produce un solo chunk', () => {
    const chunk = spezzaInChunk('Ciao, questo è un testo breve.');
    assert.equal(chunk.length, 1);
    assert.equal(chunk[0], 'Ciao, questo è un testo breve.');
  });

  test('più paragrafi corti vengono uniti in un solo chunk se stanno sotto il limite', () => {
    const testo = 'Paragrafo uno.\n\nParagrafo due.\n\nParagrafo tre.';
    const chunk = spezzaInChunk(testo);
    assert.equal(chunk.length, 1);
    assert.ok(chunk[0].includes('Paragrafo uno.'));
    assert.ok(chunk[0].includes('Paragrafo tre.'));
  });

  test('un testo molto lungo viene spezzato in più chunk, nessuno oltre il limite', () => {
    const paragrafo = 'Frase di esempio ripetuta per allungare il testo. '.repeat(50); // ~2500 caratteri
    const testo = [paragrafo, paragrafo, paragrafo].join('\n\n');
    const chunk = spezzaInChunk(testo);
    assert.ok(chunk.length > 1);
    for (const c of chunk) {
      assert.ok(c.length <= 1200, `chunk troppo lungo: ${c.length} caratteri`);
    }
  });

  test('nessun testo viene perso nello split (ricostruendo si ritrova tutto il contenuto)', () => {
    const testo = 'Uno.\n\nDue.\n\nTre.\n\nQuattro.';
    const chunk = spezzaInChunk(testo);
    const ricostruito = chunk.join(' ');
    for (const parola of ['Uno.', 'Due.', 'Tre.', 'Quattro.']) {
      assert.ok(ricostruito.includes(parola), `manca "${parola}" nel risultato`);
    }
  });
});
