import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statoConDatiNoti, aggiornaStato } from '../lib/engine/state.js';
import { pack } from '../lib/engine/packs/dentista.js';

test('riporta i dati già raccolti noti al pack, ignora chiavi interne, urgenza e valori vuoti', () => {
  const s = statoConDatiNoti(undefined, { nome_paziente: 'Lorenzo', servizio: 'prima_visita', urgente: false, _fase: 'confermato', _sids: ['a'], strano: 'x', sintomo: '' }, ['nome_paziente', 'servizio', 'sintomo']);
  assert.deepEqual(s.entities, { nome_paziente: 'Lorenzo', servizio: 'prima_visita' });
  assert.equal(s.turns, 0);
});
test('nessun dato noto: undefined (il motore parte da stato iniziale)', () => {
  assert.equal(statoConDatiNoti(undefined, { _fase: 'x', urgente: true }, ['nome_paziente']), undefined);
  assert.equal(statoConDatiNoti(undefined, null, ['a']), undefined);
});
test('il nome già noto non viene richiesto di nuovo per una prenotazione', () => {
  const prec = statoConDatiNoti(undefined, { nome_paziente: 'Lorenzo' }, pack.entities.map((e) => e.id));
  const st = aggiornaStato(prec, { intent: 'prenota_visita', confidence: 0.9, entities: {}, urgency: 'LOW', concepts: [] }, pack, []);
  assert.ok(!st.missing_entities.includes('nome_paziente'));
});

test('stato già esistente senza il nome: i dati noti si aggiungono (caso reale: stato creato prima che il nome fosse noto)', () => {
  const esistente = { turns: 2, intent: 'prenota_visita', confidence: 0.9, entities: { servizio: 'prima_visita' }, missing_entities: ['nome_paziente'] };
  const s = statoConDatiNoti(esistente, { nome_paziente: 'Lorenzo', servizio: 'igiene' }, ['nome_paziente', 'servizio']);
  assert.equal(s.entities.nome_paziente, 'Lorenzo');
  assert.equal(s.entities.servizio, 'prima_visita', 'lo stato del motore prevale sui dati salvati');
  assert.equal(s.turns, 2);
});
test('stato esistente e nessun dato noto: invariato', () => {
  const esistente = { turns: 1, entities: {} };
  assert.equal(statoConDatiNoti(esistente, { _fase: 'x' }, ['nome_paziente']), esistente);
});
