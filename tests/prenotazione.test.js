import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puoProporreSlot } from '../lib/prenotazione.js';
import { pianifica, analisiDeterministica } from '../lib/engine/run.js';
import { costruisciIndice } from '../lib/engine/pack.js';
import { pack } from '../lib/engine/packs/dentista.js';

const adesso = Date.parse('2026-10-06T10:00:00Z');
const passato = '2026-09-01T09:00:00Z';
const futuro = '2026-10-20T09:00:00Z';

test('mai confermato: si propone come sempre', () => {
  assert.equal(puoProporreSlot({ fase: undefined, adesso }), true);
  assert.equal(puoProporreSlot({ fase: 'attesa_slot', adesso }), true);
});
test('confermato con visita passata + nuova richiesta di prenotazione: si propone', () => {
  assert.equal(puoProporreSlot({ fase: 'confermato', appuntamentoInizio: passato, nuovaPrenotazione: true, adesso }), true);
});
test('confermato con visita passata ma messaggio non di prenotazione ("grazie"): no', () => {
  assert.equal(puoProporreSlot({ fase: 'confermato', appuntamentoInizio: passato, nuovaPrenotazione: false, adesso }), false);
});
test('confermato con visita ancora futura: no (evita doppie prenotazioni)', () => {
  assert.equal(puoProporreSlot({ fase: 'confermato', appuntamentoInizio: futuro, nuovaPrenotazione: true, adesso }), false);
});
test('confermato senza data salvata (conferme storiche) o data invalida: no', () => {
  assert.equal(puoProporreSlot({ fase: 'confermato', nuovaPrenotazione: true, adesso }), false);
  assert.equal(puoProporreSlot({ fase: 'confermato', appuntamentoInizio: 'boh', nuovaPrenotazione: true, adesso }), false);
});

test('motore: intent_turno distingue una nuova prenotazione da un ringraziamento anche con stato di prenotazione', () => {
  const indice = costruisciIndice(pack);
  const precedente = { intent: 'prenota_visita', confidence: 0.9, entities: { nome_paziente: 'Mario' }, turns: 3, unknown_turns: 0, sensitive_turns: 0 };
  const giri = (messaggio) => pianifica({ det: analisiDeterministica({ messaggio, pack, indice }), statoPrecedente: precedente, pack, tenant: { haCalendario: true } }).stato;
  const nuova = giri('Vorrei prenotare un\'altra visita di controllo');
  const grazie = giri('Grazie mille, a presto!');
  const cat = (id) => pack.intents.find((i) => i.id === id)?.categoria;
  assert.equal(cat(nuova.intent_turno), 'BOOKING');
  assert.notEqual(cat(grazie.intent_turno), 'BOOKING');
});

import { rispostaAppuntamentoEsistente } from '../lib/prenotazione.js';
test('appuntamento futuro: ricorda quello esistente, con nome', () => {
  const r = rispostaAppuntamentoEsistente({ fase: 'confermato', appuntamentoInizio: '2026-10-07T11:00:00.000Z', nome: 'Lorenzo', adesso: Date.parse('2026-10-06T12:00:00Z') });
  assert.match(r, /^Ciao Lorenzo, risulta già un suo appuntamento per .*7 ottobre.*13:00/);
});
test('senza nome, passato, non confermato o senza data: null/maiuscola', () => {
  const adesso = Date.parse('2026-10-06T12:00:00Z');
  assert.match(rispostaAppuntamentoEsistente({ fase: 'confermato', appuntamentoInizio: '2026-10-07T11:00:00.000Z', adesso }), /^Risulta/);
  assert.equal(rispostaAppuntamentoEsistente({ fase: 'confermato', appuntamentoInizio: '2026-10-01T11:00:00.000Z', adesso }), null);
  assert.equal(rispostaAppuntamentoEsistente({ fase: 'attesa_slot', appuntamentoInizio: '2026-10-07T11:00:00.000Z', adesso }), null);
  assert.equal(rispostaAppuntamentoEsistente({ fase: 'confermato', adesso }), null);
});
