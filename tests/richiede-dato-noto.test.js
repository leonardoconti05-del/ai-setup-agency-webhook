import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificaRisposta } from '../lib/engine/safety.js';

const pack = { identity: { entita_nome: 'nome_paziente' } };
const note = { nome_paziente: 'Lorenzo' };

test('blocca la richiesta del nome se già noto', () => {
  for (const t of ['Ciao! Qual è il tuo nome?', 'Come ti chiami?', 'Come si chiama?', 'Mi dica nome e cognome per favore']) {
    const v = verificaRisposta(t, { pack, entitaNote: note });
    assert.equal(v.ok, false, t);
    assert.equal(v.violazioni[0].tipo, 'richiede_dato_noto');
  }
});
test('permette la domanda sul nome se non noto', () => {
  assert.equal(verificaRisposta('Come ti chiami?', { pack, entitaNote: {} }).ok, true);
});
test('non blocca risposte normali con nome noto', () => {
  assert.equal(verificaRisposta('Ciao Lorenzo, ti aiuto subito.', { pack, entitaNote: note }).ok, true);
});
