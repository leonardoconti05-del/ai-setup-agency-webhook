import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaInsight } from '../lib/insights.js';

const ora = Date.parse('2026-10-06T10:00:00Z');
const h = (n) => new Date(ora - n * 3600e3).toISOString();
const lista = [
  { stato: 'completata', updated_at: h(48), dati_raccolti: { nome: 'A', _fase: 'confermato', _stato: { intent: 'prenota_visita' } } },
  { stato: 'in_corso', updated_at: h(50), dati_raccolti: { nome: 'B', _stato: { intent: 'preventivo' } } },
  { stato: 'in_corso', updated_at: h(2), dati_raccolti: { nome: 'C' } },
  { stato: 'handoff', updated_at: h(5), conversazione: [{ role: 'user', content: 'ma fate le faccette?' }, { role: 'assistant', content: 'x' }], dati_raccolti: { _handoff: { motivo: 'non_compreso' }, _stato: { intent: 'unknown', unknown_turns: 2 } } },
  { stato: 'urgente', updated_at: h(1), dati_raccolti: { urgente: true, _stato: { intent: 'emergenza' } } },
  { stato: 'in_corso', updated_at: h(24 * 60), dati_raccolti: { nome: 'vecchio' } },
];

test('conteggi sui soli ultimi 30 giorni', () => {
  const i = calcolaInsight(lista, { adesso: ora, valoreMedio: 100 });
  assert.equal(i.conversazioni, 5);
  assert.equal(i.appuntamenti_confermati, 1);
  assert.equal(i.valore_appuntamenti, 100);
  assert.equal(i.urgenze, 1);
  assert.equal(i.passate_allo_staff, 1);
});
test('lead da recuperare: dati lasciati, nessun esito, silenzio > 24h (non i recenti, non i chiusi)', () => {
  assert.equal(calcolaInsight(lista, { adesso: ora }).lead_da_recuperare, 1);
});
test('domande non capite riportano l\'ultimo messaggio del cliente', () => {
  assert.deepEqual(calcolaInsight(lista, { adesso: ora }).domande_non_capite, ['ma fate le faccette?']);
});
test('senza valore medio nessun euro inventato; input vuoto/invalido ok', () => {
  assert.equal(calcolaInsight(lista, { adesso: ora }).valore_appuntamenti, null);
  assert.equal(calcolaInsight(null).conversazioni, 0);
});
