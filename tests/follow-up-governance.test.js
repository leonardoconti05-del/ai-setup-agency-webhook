import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { svuotaCachePolicy } from '../lib/governance/policy.js';

process.env.SUPABASE_URL = 'https://s.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.CRON_SECRET = 'segreto';
process.env.TWILIO_ACCOUNT_SID = 'AC1';
process.env.TWILIO_AUTH_TOKEN = 't';
delete process.env.TWILIO_CONTENT_SID_FOLLOWUP;
const { default: handler } = await import('../api/cron/follow-up.js');
const realFetch = globalThis.fetch;
let st;

function installa(policy, clienteId = 'c1') {
  st = { twilio: 0, ledger: [] };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (v, status = 200) => ({ ok: status < 300, status, json: async () => v });
    if (u.includes('/configurazioni_cliente')) return json([{ cliente_id: clienteId, numero_whatsapp: '+39000', nome_attivita: 'Studio X', follow_up_dopo_ore: 24, follow_up_max_messaggi: 2, follow_up_orario_da: '00:00:00', follow_up_orario_a: '23:59:59', follow_up_messaggio: null }]);
    if (u.includes('/tenant_action_policy')) return json(policy);
    if (u.includes('/richieste_clienti') && !opts.method) return json([{ id: 'r1', numero_utente: '+39333', dati_raccolti: { nome: 'A' }, updated_at: new Date(Date.now() - 72 * 3600e3).toISOString() }]);
    if (u.includes('/richieste_clienti') && opts.method === 'PATCH') return json([{ id: 'r1' }]);
    if (u.includes('api.twilio.com')) { st.twilio++; return json({ sid: 'SM1' }, 201); }
    if (u.includes('/ai_action_ledger')) {
      if (opts.method === 'POST') { st.ledger.push(JSON.parse(opts.body)); return json([], 201); }
      return json([]);
    }
    return json([]);
  };
}
beforeEach(() => svuotaCachePolicy());
afterEach(() => { globalThis.fetch = realFetch; });

const chiama = async () => {
  svuotaCachePolicy();
  let out;
  const res = { status(c) { this.code = c; return this; }, json(v) { out = v; return this; } };
  await handler({ headers: { authorization: 'Bearer segreto' } }, res);
  return out;
};

describe('follow-up governance', { concurrency: false }, () => {
test('policy mancante: il follow-up è negato', async () => {
  installa([], 'c1');
  const r = await chiama();
  assert.equal(r.inviati, 0); assert.equal(st.twilio, 0); assert.equal(r.saltatiPolicy, 1);
});

test('policy esplicita livello 3: il follow-up parte e finisce nel ledger senza telefono', async () => {
  installa([{ agent_id: 'followup', action: 'send_followup', autonomy_level: 3, condizioni: {} }], 'c2');
  const r = await chiama();
  assert.equal(r.inviati, 1); assert.equal(st.twilio, 1);
  assert.equal(st.ledger.length, 1);
  assert.equal(st.ledger[0].action, 'followup_sent');
  assert.ok(!JSON.stringify(st.ledger[0]).includes('+39333'));
});

test('il titolare ha messo il follow-up a livello 2 (solo bozza): nessun invio', async () => {
  installa([{ agent_id: 'followup', action: 'send_followup', autonomy_level: 2, condizioni: {} }], 'c3');
  const r = await chiama();
  assert.equal(r.inviati, 0); assert.equal(st.twilio, 0); assert.equal(r.saltatiPolicy, 1);
});

test('livello 4 (serve approvazione): il cron non invia da solo', async () => {
  installa([{ agent_id: 'followup', action: 'send_followup', autonomy_level: 4, condizioni: {} }], 'c4');
  const r = await chiama();
  assert.equal(st.twilio, 0); assert.equal(r.saltatiPolicy, 1);
});
});
