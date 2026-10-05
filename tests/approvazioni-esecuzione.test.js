import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidiApprovazione, elencoApprovazioniPending } from '../lib/governance/esegui-approvata.js';

function ctx({ richiesta, config = { numero_whatsapp: 'whatsapp:+39000', google_calendar_id: 'cal', clienti: { nome_attivita: 'Studio X' } }, pending = true } = {}) {
  const chiamate = [];
  const fetchImpl = async (url, opts = {}) => {
    const u = String(url);
    chiamate.push({ u, method: opts.method || 'GET', body: opts.body });
    const json = (v) => ({ ok: true, status: 200, json: async () => v });
    if (u.includes('/approval_requests') && opts.method === 'PATCH') return json(pending ? [richiesta] : []);
    if (u.includes('/configurazioni_cliente')) return json(config ? [config] : []);
    if (u.includes('/richieste_clienti')) return json(opts.method ? [{}] : [{ dati_raccolti: { nome_paziente: 'Mario' } }]);
    return json([]);
  };
  return { chiamate, c: { SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl } };
}
const cal = { id: 'a1', cliente_id: 'c1', action: 'create_calendar_event', payload: { numero_utente: '+39333', inizio: '2026-10-08T09:00:00.000Z', fine: '2026-10-08T10:00:00.000Z' } };
const rep = { id: 'a2', cliente_id: 'c1', action: 'reply', payload: { numero_utente: '+39333', bozza: 'Ciao, ecco la risposta' } };

test('approva calendario: crea evento, aggiorna richiesta, avvisa cliente, scrive nel ledger', async () => {
  const { c, chiamate } = ctx({ richiesta: cal });
  const ev = []; const msg = []; const led = [];
  const r = await decidiApprovazione(c, { cliente_id: 'c1', id: 'a1', decisione: 'approved' }, {
    creaEvento: async (...a) => { ev.push(a); return { id: 'e' }; },
    inviaWhatsApp: async (m) => msg.push(m),
    registra: async (_c, e) => led.push(e),
  });
  assert.equal(r.ok, true); assert.equal(r.eseguita, true);
  assert.equal(ev.length, 1); assert.equal(ev[0][0], 'cal');
  assert.match(msg[0].testo, /Appuntamento confermato/);
  assert.ok(chiamate.some((x) => x.method === 'PATCH' && x.u.includes('/richieste_clienti') && x.body.includes('confermato')));
  assert.equal(led[0].action, 'create_calendar_event_executed');
  assert.equal(led[0].approval, 'approved');
  assert.ok(!JSON.stringify(led[0]).includes('+39333'), 'il ledger non contiene il telefono');
});

test('approva risposta: invia la bozza', async () => {
  const { c } = ctx({ richiesta: rep });
  const msg = [];
  const r = await decidiApprovazione(c, { cliente_id: 'c1', id: 'a2', decisione: 'approved' }, { inviaWhatsApp: async (m) => msg.push(m), registra: async () => {} });
  assert.equal(r.eseguita, true); assert.equal(msg[0].testo, 'Ciao, ecco la risposta');
});

test('rifiuto: nessuna esecuzione', async () => {
  const { c } = ctx({ richiesta: cal });
  let eseguito = false; const led = [];
  const r = await decidiApprovazione(c, { cliente_id: 'c1', id: 'a1', decisione: 'rejected' }, { creaEvento: async () => { eseguito = true; }, registra: async (_c, e) => led.push(e) });
  assert.equal(r.ok, true); assert.equal(eseguito, false); assert.equal(led[0].approval, 'rejected');
});

test('già decisa o di un altro tenant: nessuna esecuzione', async () => {
  const { c } = ctx({ richiesta: cal, pending: false });
  let eseguito = false;
  const r = await decidiApprovazione(c, { cliente_id: 'altro', id: 'a1', decisione: 'approved' }, { creaEvento: async () => { eseguito = true; } });
  assert.equal(r.ok, false); assert.equal(eseguito, false);
});

test('la decisione filtra per cliente_id e stato pending nella query', async () => {
  const { c, chiamate } = ctx({ richiesta: rep });
  await decidiApprovazione(c, { cliente_id: 'c1', id: 'a2', decisione: 'rejected' }, { registra: async () => {} });
  const p = chiamate.find((x) => x.method === 'PATCH');
  assert.match(p.u, /cliente_id=eq\.c1/); assert.match(p.u, /stato=eq\.pending/);
});

test('errore di esecuzione: esito onesto, non "fatto"', async () => {
  const { c } = ctx({ richiesta: cal });
  const led = [];
  const r = await decidiApprovazione(c, { cliente_id: 'c1', id: 'a1', decisione: 'approved' }, { creaEvento: async () => { throw new Error('boom'); }, inviaWhatsApp: async () => {}, registra: async (_c, e) => led.push(e) });
  assert.equal(r.eseguita, false); assert.match(r.esito, /boom/); assert.equal(led[0].action, 'create_calendar_event_failed');
});

test('azione sconosciuta: approvata ma non eseguita', async () => {
  const { c } = ctx({ richiesta: { ...rep, action: 'delete_everything' } });
  const r = await decidiApprovazione(c, { cliente_id: 'c1', id: 'a2', decisione: 'approved' }, { registra: async () => {} });
  assert.equal(r.eseguita, false);
});

test('elenco pending: tabella assente -> lista vuota', async () => {
  const c = { SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl: async () => ({ json: async () => ({ message: 'relation does not exist' }) }) };
  assert.deepEqual(await elencoApprovazioniPending(c, 'c1'), []);
});
