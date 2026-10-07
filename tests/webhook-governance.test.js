import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pack, faq } from '../lib/engine/packs/dentista.js';
import { svuotaCachePack } from '../lib/engine/pack.js';
import { svuotaCachePolicy } from '../lib/governance/policy.js';
import { verificaCatena } from '../lib/governance/ledger.js';

process.env.SUPABASE_URL = 'https://s.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.ALLOW_UNVERIFIED_WEBHOOK = 'true';
delete process.env.TWILIO_AUTH_TOKEN;
process.env.ANTHROPIC_API_KEY = 'a';
const { default: handler } = await import('../api/whatsapp.js');
const realFetch = globalThis.fetch;
let st;

function installa({ conPack = true, policy = [
    { agent_id: 'whatsapp', action: 'reply', autonomy_level: 3, condizioni: {} },
    { agent_id: 'whatsapp', action: 'handoff', autonomy_level: 3, condizioni: {} },
    { agent_id: 'whatsapp', action: 'emergency_escalation', autonomy_level: 5, condizioni: {} },
  ], ledgerAssente = false } = {}) {
  st = { ledger: [], approvazioni: [], salvataggi: [], anthropic: [] };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (v, status = 200) => ({ ok: status < 300, status, json: async () => v, text: async () => JSON.stringify(v) });
    if (u.includes('/configurazioni_cliente')) return json([{ cliente_id: 'c1', settore: 'dentista', numero_whatsapp: 'whatsapp:+1', attivo: true, clienti: { nome_attivita: 'Studio X' }, campi_da_raccogliere: [{ campo: 'nome_paziente', domanda: 'Nome?' }], google_calendar_id: null, telegram_chat_id: null }]);
    if (u.includes('/sector_profiles')) return json(conPack ? [{ id: 'p', version: 3, pack }] : []);
    if (u.includes('/sector_faq')) return json(faq.map((f) => ({ ...f, condizioni: {} })));
    if (u.includes('/action_registry')) {
      const requested = new URL(u).searchParams.get('action_id')?.replace('eq.', '');
      const actions = {
        reply: { action_id: 'reply', name: 'Reply', risk_level: 'low', required_autonomy: 3, approval_required: false, executor: 'whatsapp.reply', executor_version: '1', active: true, metadata: { agent: 'whatsapp' } },
        handoff: { action_id: 'handoff', name: 'Handoff', risk_level: 'medium', required_autonomy: 3, approval_required: false, executor: 'whatsapp.handoff', executor_version: '1', active: true, metadata: { agent: 'whatsapp' } },
        emergency_escalation: { action_id: 'emergency_escalation', name: 'Emergency escalation', risk_level: 'critical', required_autonomy: 5, approval_required: false, executor: 'whatsapp.emergency_escalation', executor_version: '1', active: true, metadata: { agent: 'whatsapp' } },
      };
      return json(requested && actions[requested] ? [actions[requested]] : []);
    }
    if (u.includes('/agent_registry')) return json([{ agent_id: 'whatsapp', attivo: true }]);
    if (u.includes('/tenant_action_policy')) return json(policy);
    if (u.includes('/approval_requests')) { st.approvazioni.push(JSON.parse(opts.body)); return json([{ id: 'ap1' }], 201); }
    if (u.includes('/ai_action_ledger')) {
      if (ledgerAssente) return json({ message: 'relation "public.ai_action_ledger" does not exist' }, 404);
      if (opts.method === 'POST') { st.ledger.push({ id: st.ledger.length + 1, ...JSON.parse(opts.body) }); return json([], 201); }
      return json(st.ledger.slice(-1).map((r) => ({ row_hash: r.row_hash })));
    }
    if (u.includes('/servizi_cliente') || u.includes('/personale_cliente') || u.includes('match_knowledge') || u.includes('voyage')) return json([]);
    if (u.includes('/event_log')) return json([]);
    if (u.includes('/richieste_clienti')) { if (opts.method) st.salvataggi.push(JSON.parse(opts.body)); return json(opts.method ? [{ ok: 1 }] : []); }
    if (u.includes('api.anthropic.com')) {
      const b = JSON.parse(opts.body); st.anthropic.push(b.tools ? 'analisi' : 'chat');
      if (b.tools) return json({ content: [{ type: 'tool_use', input: { intent: 'prenota_visita', confidence: 0.9, entities: {}, urgency: 'LOW' } }], usage: { input_tokens: 10, output_tokens: 5 } });
      return json({ content: [{ type: 'text', text: 'Certo, come si chiama?' }], usage: { input_tokens: 10, output_tokens: 5 } });
    }
    return json([]);
  };
}
const req = (t) => ({ method: 'POST', headers: { host: 'x.test' }, url: '/api/whatsapp', body: { Body: t, From: 'whatsapp:+393331112222', To: 'whatsapp:+1', MessageSid: 'SM' + Math.random() } });
const resp = () => { const r = { code: null, body: '', headers: {} }; r.status = (c) => { r.code = c; return r; }; r.setHeader = () => {}; r.send = (b) => { r.body = b; return r; }; return r; };

describe('governance nel webhook', () => {
  beforeEach(() => { svuotaCachePack(); svuotaCachePolicy(); });
  afterEach(() => { globalThis.fetch = realFetch; });

  test('percorso motore: una riga di ledger con fonti, versione pack, hash e senza telefono/testo', async () => {
    installa();
    const r = resp(); await handler(req('vorrei prenotare una pulizia'), r);
    assert.equal(r.code, 200);
    assert.equal(st.ledger.length, 2);
    const l = st.ledger.find((entry) => entry.action === 'reply_sent');
    assert.equal(l.cliente_id, 'c1'); assert.equal(l.action, 'reply_sent'); assert.equal(l.pack_version, 3);
    assert.equal(l.autonomy_level, 3); assert.equal(l.prompt_version, 'motore-2');
    assert.ok(l.sources.some((s) => s.tipo === 'pack' && s.settore === 'dentista' && s.versione === 3));
    assert.equal(verificaCatena(st.ledger).ok, true);
    const dump = JSON.stringify(st.ledger);
    assert.doesNotMatch(dump, /393331112222/); assert.doesNotMatch(dump, /vorrei prenotare/);
  });
  test('emergenza: ledger registra emergency_escalation, zero chiamate al modello', async () => {
    installa();
    await handler(req('non riesco a respirare'), resp());
    assert.deepEqual(st.anthropic, []);
    assert.ok(st.ledger.some((entry) => entry.action === 'emergency_escalation'));
  });
  test('ledger assente (migrazione non applicata): il cliente riceve la risposta normale', async () => {
    installa({ ledgerAssente: true });
    const r = resp(); await handler(req('vorrei prenotare'), r);
    assert.equal(r.code, 200);
    assert.match(r.body, /Certo, come si chiama\?/);
  });
  test('policy reply = 4: al cliente va un messaggio neutro, la bozza va in approvazione, ledger "pending"', async () => {
    installa({ policy: [{ agent_id: 'whatsapp', action: 'reply', autonomy_level: 4, condizioni: {} }] });
    const r = resp(); await handler(req('vorrei prenotare'), r);
    assert.doesNotMatch(r.body, /come si chiama/i);
    assert.equal(st.approvazioni.length, 1);
    assert.equal(st.approvazioni[0].payload.bozza, 'Certo, come si chiama?');
    assert.equal(st.ledger[0].approval, 'pending'); assert.equal(st.ledger[0].autonomy_level, 4);
  });
  test('settore senza pack: percorso legacy, nessuna scrittura nel ledger né query di policy', async () => {
    installa({ conPack: false });
    globalThis.__urls = [];
    const f = globalThis.fetch; globalThis.fetch = async (u, o) => { globalThis.__urls.push(String(u)); return f(u, o); };
    await handler(req('vorrei prenotare'), resp());
    assert.equal(st.ledger.length, 0);
    assert.ok(!globalThis.__urls.some((u) => u.includes('tenant_action_policy') || u.includes('ai_action_ledger')));
  });
});
