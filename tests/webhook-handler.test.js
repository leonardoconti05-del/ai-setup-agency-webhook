import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pack, faq } from '../lib/engine/packs/dentista.js';
import { svuotaCachePack } from '../lib/engine/pack.js';

process.env.SUPABASE_URL = 'https://s.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.ALLOW_UNVERIFIED_WEBHOOK = 'true';
delete process.env.TWILIO_AUTH_TOKEN;
process.env.ANTHROPIC_API_KEY = 'a';
const { default: handler } = await import('../api/whatsapp.js');

const realFetch = globalThis.fetch;
let log;
function installa({ conPack, settore = 'dentista', anthropicRotto = false }) {
  log = { anthropic: [], salvataggi: [], eventi: [], urls: [] };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    log.urls.push(u);
    const json = (v) => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
    if (u.includes('/configurazioni_cliente')) return json([{ cliente_id: 'c1', settore, numero_whatsapp: 'whatsapp:+1', attivo: true, clienti: { nome_attivita: 'Studio X' }, campi_da_raccogliere: [{ campo: 'nome_paziente', domanda: 'Nome?' }, { campo: 'sintomo', domanda: 'Sintomo?' }, { campo: 'urgenza', domanda: 'Urgenza?' }], google_calendar_id: null, telegram_chat_id: null }]);
    if (u.includes('/sector_profiles')) return json(conPack ? [{ id: 'p', version: 1, pack }] : []);
    if (u.includes('/sector_faq')) return json(faq.map((f) => ({ ...f, intent: f.intent, condizioni: {} })));
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
    if (u.includes('/tenant_action_policy')) return json([]);
    if (u.includes('/approval_requests')) return json([{ id: 'ap1' }], 201);
    if (u.includes('/servizi_cliente') || u.includes('/personale_cliente')) return json([]);
    if (u.includes('match_knowledge_chunks') || u.includes('voyage')) return json([]);
    if (u.includes('/event_log')) { log.eventi.push(JSON.parse(opts.body)); return json([]); }
    if (u.includes('/richieste_clienti')) {
      if (opts.method === 'POST' || opts.method === 'PATCH') { log.salvataggi.push(JSON.parse(opts.body)); return json([{ ok: 1 }]); }
      return json([]);
    }
    if (u.includes('api.anthropic.com')) {
      const b = JSON.parse(opts.body);
      log.anthropic.push(b.tools ? (b.tools[0].name) : 'chat');
      if (anthropicRotto) return json({ error: 'boom' });
      if (b.tools?.[0]?.name === 'analizza_messaggio') return json({ content: [{ type: 'tool_use', input: { intent: 'prenota_visita', confidence: 0.9, entities: {}, urgency: 'LOW' } }], usage: { input_tokens: 10, output_tokens: 5 } });
      if (b.tools) return json({ content: [{ type: 'tool_use', input: { nome_paziente: 'Sara' } }] });
      return json({ content: [{ type: 'text', text: 'Certo, come si chiama?' }], usage: { input_tokens: 10, output_tokens: 5 } });
    }
    return json([]);
  };
}
const richiesta = (testo) => ({ method: 'POST', headers: { host: 'x.test' }, url: '/api/whatsapp', body: { Body: testo, From: 'whatsapp:+390000', To: 'whatsapp:+1', MessageSid: 'SM' + Math.random() } });
const risposta = () => { const r = { code: null, body: '', headers: {} }; r.status = (c) => { r.code = c; return r; }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.send = (b) => { r.body = b; return r; }; return r; };

describe('handler WhatsApp', () => {
  beforeEach(() => svuotaCachePack());
  afterEach(() => { globalThis.fetch = realFetch; });

  test('settore senza pack in produzione: percorso legacy (chat + estrai_dati), nessuna fase "motore"', async () => {
    installa({ conPack: false });
    const res = risposta();
    await handler(richiesta('vorrei prenotare'), res);
    assert.equal(res.code, 200);
    assert.deepEqual(log.anthropic, ['chat', 'estrai_dati']);
    assert.ok(!log.eventi.some((e) => e.fase === 'motore'));
    assert.match(res.body, /Certo, come si chiama\?/);
  });

  test('settore con pack in produzione: percorso motore, stato salvato in _stato, evento "motore" con costi', async () => {
    installa({ conPack: true });
    const res = risposta();
    await handler(richiesta('vorrei prenotare una pulizia'), res);
    assert.equal(res.code, 200);
    assert.deepEqual(log.anthropic, ['analizza_messaggio', 'chat']);
    const ev = log.eventi.find((e) => e.fase === 'motore');
    assert.ok(ev && ev.dettaglio.intent === 'prenota_visita' && ev.dettaglio.chiamate_llm === 2);
    const salvato = log.salvataggi.at(-1);
    assert.equal(salvato.dati_raccolti._stato.intent, 'prenota_visita');
    assert.equal(salvato.stato, 'in_corso');
    assert.ok(!log.urls.some((u) => u.includes('sector_profiles') && u.includes('cliente_id')));
  });

  test('urgenza critica: nessuna chiamata Anthropic, stato urgente + _handoff salvato', async () => {
    installa({ conPack: true });
    const res = risposta();
    await handler(richiesta('non riesco a respirare'), res);
    assert.deepEqual(log.anthropic, []);
    const salvato = log.salvataggi.at(-1);
    assert.equal(salvato.stato, 'urgente');
    assert.equal(salvato.dati_raccolti._handoff.tipo, 'emergency');
    assert.match(res.body, /118/);
  });

  test('richiesta di una persona: stato handoff', async () => {
    installa({ conPack: true });
    const res = risposta();
    await handler(richiesta('voglio parlare con una persona'), res);
    assert.equal(log.salvataggi.at(-1).stato, 'handoff');
  });

  test('pack in produzione ma Anthropic in errore: il cliente riceve comunque una risposta sensata, mai un errore tecnico', async () => {
    installa({ conPack: true, anthropicRotto: true });
    const res = risposta();
    await handler(richiesta('vorrei prenotare'), res);
    assert.equal(res.code, 200);
    assert.doesNotMatch(res.body, /boom|undefined|Error/);
    assert.match(res.body, /<Message>.+<\/Message>/);
  });
});
