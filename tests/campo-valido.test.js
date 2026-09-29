import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { campoValido } from '../api/whatsapp.js';

describe('campoValido', () => {
  test('false è un valore valido', () => assert.equal(campoValido(false), true));
  test('0 è un valore valido', () => assert.equal(campoValido(0), true));
  test('null non è valido', () => assert.equal(campoValido(null), false));
  test('undefined non è valido', () => assert.equal(campoValido(undefined), false));
  test('stringa vuota non è valida', () => assert.equal(campoValido(''), false));
  test('stringa di soli spazi è attualmente considerata valida (nessun trim)', () => assert.equal(campoValido('   '), true));
  test('una stringa normale è valida', () => assert.equal(campoValido('ciao'), true));
  test('un oggetto è valido', () => assert.equal(campoValido({ a: 1 }), true));
  test('un array è valido', () => assert.equal(campoValido([1, 2]), true));
});
