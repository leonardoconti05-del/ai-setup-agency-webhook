import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pack, faq } from '../lib/engine/packs/dentista.js';
import { costruisciIndice, caricaPackProduzione, svuotaCachePack } from '../lib/engine/pack.js';
import { eseguiMotore } from '../lib/engine/orchestratore.js';
import { costruisciSystemPromptMotore } from '../lib/engine/prompt.js';

const caricato = { id: 'p1', version: 1, settore: 'dentista', pack, faq, indice: costruisciIndice(pack, faq) };
const campiTenant = ['nome_paziente', 'sintomo', 'urgenza'];
const configA = { google_calendar_id: null, info_generali: { prezzi: 'pacchetto base 100 euro' } };

// LLM simulato: analisi (tool_use) e chat (text). Conta le chiamate.
function llmFinto({ analisi = { intent: 'unknown', confidence: 0.3, entities: {}, urgency: 'LOW' }, chat = 'Certo, come si chiama?', fallisce = false } = {}) {
  const chiamate = [];
  const fn = async (url, opts) => {
    const body = JSON.parse(opts.body);
    chiamate.push(body.tools ? 'analisi' : 'chat');
    if (fallisce) throw new Error('rete giù');
    if (body.tools) return { json: async () => ({ content: [{ type: 'tool_use', input: analisi }], usage: { input_tokens: 100, output_tokens: 20 } }) };
    return { json: async () => ({ content: [{ type: 'text', text: chat }], usage: { input_tokens: 200, output_tokens: 30 } }) };
  };
  fn.chiamate = chiamate;
  return fn;
}
const base = (messaggio, fetchImpl, extra = {}) => eseguiMotore({
  caricato, config: configA, nomeAttivita: 'Studio A', history: [{ role: 'user', content: messaggio }], messaggio,
  statoPrecedente: undefined, campiTenant, apiKey: 'k', fetchImpl, ...extra,
});

describe('motore: percorso a costo zero e fallback', () => {
  test('urgenza critica: risposta predefinita, nessuna chiamata LLM, handoff creato', async () => {
    const f = llmFinto();
    const r = await base('non riesco a respirare e ho la faccia gonfia', f);
    assert.equal(f.chiamate.length, 0);
    assert.equal(r.azione.action, 'emergency_escalation');
    assert.match(r.reply, /118/);
    assert.ok(r.handoff && r.handoff.tipo === 'emergency');
    assert.equal(r.urgente, true);
  });
  test('richiesta di una persona: template, zero LLM', async () => {
    const f = llmFinto();
    const r = await base('voglio parlare con una persona', f);
    assert.equal(f.chiamate.length, 0);
    assert.equal(r.azione.action, 'human_handoff');
    assert.ok(r.handoff);
  });
  test('prenotazione: 2 chiamate LLM, entità nello stato, domanda successiva', async () => {
    const f = llmFinto({ analisi: { intent: 'prenota_visita', confidence: 0.9, entities: {}, urgency: 'LOW' } });
    const r = await base('vorrei prenotare una pulizia dei denti', f);
    assert.deepEqual(f.chiamate, ['analisi', 'chat']);
    assert.equal(r.azione.action, 'ask_missing_information');
    assert.equal(r.completo, false);
    assert.equal(r.telemetria.chiamate_llm, 2);
    assert.ok(r.telemetria.costo_usd > 0);
  });
  test('il modello inventa un prezzo: la risposta è bloccata e sostituita da un fallback sicuro', async () => {
    const f = llmFinto({ analisi: { intent: 'info_prezzi', confidence: 0.9, entities: {}, urgency: 'LOW' }, chat: 'La pulizia costa 45 euro.' });
    const r = await base('quanto costa la pulizia?', f);
    assert.doesNotMatch(r.reply, /45/);
    assert.equal(r.telemetria.origine_risposta, 'fallback_verifica');
    assert.ok(r.telemetria.violazioni.includes('importo_non_in_fonte'));
  });
  test('un prezzo presente nei dati del tenant è consentito', async () => {
    const f = llmFinto({ analisi: { intent: 'info_prezzi', confidence: 0.9, entities: {}, urgency: 'LOW' }, chat: 'Il pacchetto base è 100 euro.' });
    const r = await base('quanto costa il pacchetto base?', f);
    assert.equal(r.telemetria.origine_risposta, 'llm');
  });
  test('LLM non raggiungibile: nessuna eccezione, risposta deterministica, mai errore tecnico', async () => {
    const f = llmFinto({ fallisce: true });
    const r = await base('vorrei prenotare una visita', f);
    assert.ok(r.reply && r.reply.length > 0);
    assert.doesNotMatch(r.reply, /error|errore|undefined|rete/i);
    assert.equal(r.telemetria.origine_risposta, 'fallback_errore');
  });
  test('richiesta di diagnosi: risposta di sicurezza, nessun consiglio clinico', async () => {
    const f = llmFinto({ chat: 'Hai sicuramente una carie, prenda un antibiotico.' });
    const r = await base('ho un dente che fa male, che cosa ho? devo prendere un antibiotico?', f);
    assert.doesNotMatch(r.reply, /carie|antibiotico/i);
  });
  test('senza API key il motore risponde comunque con le regole deterministiche', async () => {
    const r = await eseguiMotore({ caricato, config: configA, nomeAttivita: 'A', history: [{ role: 'user', content: 'vorrei prenotare' }], messaggio: 'vorrei prenotare', campiTenant, apiKey: undefined, fetchImpl: llmFinto() });
    assert.ok(r.reply);
  });
});

describe('isolamento multi-tenant', () => {
  test('il prompt di un tenant non contiene dati di un altro', () => {
    const cfgB = { info_generali: { prezzi: 'pulizia 77 euro', indirizzo: 'via roma 9' } };
    const pA = costruisciSystemPromptMotore({ pack, config: configA, nomeAttivita: 'Studio A' });
    const pB = costruisciSystemPromptMotore({ pack, config: cfgB, nomeAttivita: 'Studio B' });
    assert.doesNotMatch(pA, /via roma 9|77 euro|Studio B/);
    assert.match(pB, /via roma 9/);
    assert.doesNotMatch(pB, /Studio A|pacchetto base/);
  });
  test('un prezzo di un altro tenant viene bloccato come inventato', async () => {
    const f = llmFinto({ analisi: { intent: 'info_prezzi', confidence: 0.9, entities: {}, urgency: 'LOW' }, chat: 'La pulizia costa 77 euro.' });
    const r = await base('quanto costa la pulizia?', f);
    assert.doesNotMatch(r.reply, /77/);
  });
  test('lo stato di un cliente non influenza un altro cliente', async () => {
    const f = llmFinto({ analisi: { intent: 'prenota_visita', confidence: 0.9, entities: { nome_paziente: 'Marco' }, urgency: 'LOW' } });
    const r1 = await base('vorrei prenotare, sono Marco', f);
    const r2 = await base('vorrei prenotare', llmFinto({ analisi: { intent: 'prenota_visita', confidence: 0.9, entities: {}, urgency: 'LOW' } }));
    assert.equal(r1.entities.nome_paziente, 'Marco');
    assert.equal(r2.entities.nome_paziente, undefined);
  });
});

describe('caricaPackProduzione', () => {
  beforeEach(() => svuotaCachePack());
  test('query per settore + status production; nessun cliente_id; cache', async () => {
    const urls = [];
    const f = async (url) => { urls.push(url); return { json: async () => (url.includes('sector_profiles') ? [{ id: 'x', version: 2, pack }] : []) }; };
    const r1 = await caricaPackProduzione('https://s.test', {}, 'dentista', { fetchImpl: f });
    await caricaPackProduzione('https://s.test', {}, 'dentista', { fetchImpl: f });
    assert.equal(r1.version, 2);
    assert.ok(urls[0].includes('settore=eq.dentista') && urls[0].includes('status=eq.production'));
    assert.ok(urls.every((u) => !u.includes('cliente_id')));
    assert.equal(urls.length, 2); // 1 profilo + 1 faq, la seconda chiamata arriva dalla cache
  });
  test('settore senza pack, pack non valido o errore di rete: null (percorso legacy)', async () => {
    assert.equal(await caricaPackProduzione('u', {}, 'parrucchiere', { fetchImpl: async () => ({ json: async () => [] }) }), null);
    svuotaCachePack();
    assert.equal(await caricaPackProduzione('u', {}, 'x', { fetchImpl: async () => ({ json: async () => [{ id: 1, version: 1, pack: { rotto: true } }] }) }), null);
    svuotaCachePack();
    assert.equal(await caricaPackProduzione('u', {}, 'y', { fetchImpl: async () => { throw new Error('giù'); } }), null);
    assert.equal(await caricaPackProduzione('u', {}, null), null);
  });
});
