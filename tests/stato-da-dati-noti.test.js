import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statoDaDatiNoti, aggiornaStato } from '../lib/engine/state.js';
import { pack } from '../lib/engine/packs/dentista.js';

test('riporta i dati già raccolti noti al pack, ignora chiavi interne, urgenza e valori vuoti', () => {
  const s = statoDaDatiNoti({ nome_paziente: 'Lorenzo', servizio: 'prima_visita', urgente: false, _fase: 'confermato', _sids: ['a'], strano: 'x', sintomo: '' }, ['nome_paziente', 'servizio', 'sintomo']);
  assert.deepEqual(s.entities, { nome_paziente: 'Lorenzo', servizio: 'prima_visita' });
  assert.equal(s.turns, 0);
});
test('nessun dato noto: undefined (il motore parte da stato iniziale)', () => {
  assert.equal(statoDaDatiNoti({ _fase: 'x', urgente: true }, ['nome_paziente']), undefined);
  assert.equal(statoDaDatiNoti(null, ['a']), undefined);
});
test('il nome già noto non viene richiesto di nuovo per una prenotazione', () => {
  const prec = statoDaDatiNoti({ nome_paziente: 'Lorenzo' }, pack.entities.map((e) => e.id));
  const st = aggiornaStato(prec, { intent: 'prenota_visita', confidence: 0.9, entities: {}, urgency: 'LOW', concepts: [] }, pack, []);
  assert.ok(!st.missing_entities.includes('nome_paziente'));
});
