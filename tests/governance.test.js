import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pack } from '../lib/engine/packs/dentista.js';
import { registra, verificaCatena, calcolaHash, GENESIS, riferimentoSoggetto } from '../lib/governance/ledger.js';
import { costruisciContesto, sezioniPerIntent } from '../lib/governance/contesto.js';
import { valutaAzione, DEFAULT } from '../lib/governance/policy.js';
import { chiamaModello } from '../lib/governance/modello.js';
import { richiediApprovazione, risolviApprovazione } from '../lib/governance/approvazioni.js';
import { fontiUsate } from '../lib/governance/lineage.js';

// DB finto con comportamento del ledger (catena + indice unico su prev_hash)
function dbLedger() {
  const righe = [];
  const f = async (url, opts = {}) => {
    if (opts.method === 'POST') {
      const b = JSON.parse(opts.body);
      if (righe.some((r) => r.cliente_id === b.cliente_id && r.prev_hash === b.prev_hash)) return { ok: false, status: 409, json: async () => ({}) };
      righe.push({ id: righe.length + 1, ...b });
      return { ok: true, status: 201, json: async () => ({}) };
    }
    const cid = new URL(url).searchParams.get('cliente_id').replace('eq.', '');
    const mie = righe.filter((r) => r.cliente_id === cid).slice(-1).map((r) => ({ row_hash: r.row_hash }));
    return { ok: true, status: 200, json: async () => mie };
  };
  return { f, righe };
}

describe('ledger', () => {
  test('catena valida su più scritture, per tenant indipendenti', async () => {
    const { f, righe } = dbLedger();
    const ctx = { SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl: f };
    for (let i = 0; i < 3; i++) assert.equal((await registra(ctx, { cliente_id: 'A', actor: 'agent:whatsapp', action: 'reply_sent', output_excerpt: `r${i}` })).ok, true);
    await registra(ctx, { cliente_id: 'B', actor: 'agent:whatsapp', action: 'reply_sent' });
    const a = righe.filter((r) => r.cliente_id === 'A');
    assert.equal(a[0].prev_hash, GENESIS);
    assert.deepEqual(verificaCatena(a), { ok: true, righe: 3 });
    assert.equal(righe.find((r) => r.cliente_id === 'B').prev_hash, GENESIS); // catena separata
  });
  test('una modifica a posteriori viene rilevata', async () => {
    const { f, righe } = dbLedger();
    const ctx = { SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl: f };
    for (let i = 0; i < 3; i++) await registra(ctx, { cliente_id: 'A', actor: 'x', action: 'reply_sent', output_excerpt: `r${i}` });
    righe[1].output_excerpt = 'manomesso';
    const v = verificaCatena(righe);
    assert.equal(v.ok, false);
    assert.equal(v.indice, 1);
    righe[1].output_excerpt = 'r1';
    righe[2].prev_hash = 'x';
    assert.equal(verificaCatena(righe).ok, false);
  });
  test('tabella assente o rete giù: non lancia, ritorna ok:false', async () => {
    const r1 = await registra({ SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl: async () => { throw new Error('giù'); } }, { cliente_id: 'A', actor: 'x', action: 'y' });
    assert.equal(r1.ok, false);
    const r2 = await registra({ SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({ message: 'relation does not exist' }) }) }, { cliente_id: 'A', actor: 'x', action: 'y' });
    assert.equal(r2.ok, false);
  });
  test('il testo del cliente e il telefono non finiscono nel ledger', async () => {
    const { f, righe } = dbLedger();
    const sub = riferimentoSoggetto('A', '+393331112222');
    await registra({ SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl: f }, { cliente_id: 'A', actor: 'x', action: 'reply_sent', subject_ref: sub, input_hash: 'h' });
    const dump = JSON.stringify(righe);
    assert.doesNotMatch(dump, /393331112222/);
    assert.notEqual(riferimentoSoggetto('A', '+39333'), riferimentoSoggetto('B', '+39333')); // non collegabile tra tenant
  });
  test('output_excerpt tagliato a 300 caratteri', async () => {
    const { f, righe } = dbLedger();
    await registra({ SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl: f }, { cliente_id: 'A', actor: 'x', action: 'y', output_excerpt: 'z'.repeat(1000) });
    assert.equal(righe[0].output_excerpt.length, 300);
  });
  test('calcolaHash dipende dal prev_hash', () => {
    const r = { cliente_id: 'A', actor: 'x', action: 'y' };
    assert.notEqual(calcolaHash('a', r), calcolaHash('b', r));
  });
});

describe('contesto (minimizzazione)', () => {
  const config = { tono: 'formale', info_generali: { prezzi: 'pacchetto base 100 euro', indirizzo: 'via fano 3' }, orari_apertura: { lun: '9-18' } };
  const servizi = [{ nome: 'Igiene', prezzo: 80 }]; const personale = [{ nome: 'Dr Rossi', ruolo: 'dentista' }];
  test('prenotazione: niente info_generali né personale', () => {
    const c = costruisciContesto({ intentId: 'prenota_visita', pack, config, servizi, personale, contestoKB: 'doc' });
    assert.equal(c.config.info_generali, undefined);
    assert.deepEqual(c.personale, []);
    assert.equal(c.contestoKB, '');
    assert.ok(c.config.orari_apertura && c.servizi.length === 1);
  });
  test('informazioni sul personale: contesto completo', () => {
    const c = costruisciContesto({ intentId: 'info_personale', pack, config, servizi, personale, contestoKB: 'doc' });
    assert.equal(c.personale.length, 1);
    assert.ok(c.config.info_generali);
  });
  test('multi-intent: unione delle sezioni (prenota + prezzi)', () => {
    const s = sezioniPerIntent('prenota_visita', pack, ['info_prezzi']);
    assert.ok(s.includes('info') && s.includes('servizi'));
  });
  test('reclamo/disdetta/sposta: nessun dato del tenant al modello', () => {
    for (const id of ['reclamo', 'cancella_appuntamento', 'sposta_appuntamento']) assert.deepEqual(sezioniPerIntent(id, pack), []);
  });
  test('intent sconosciuto: contesto minimo (solo orari)', () => {
    assert.deepEqual(sezioniPerIntent('unknown', pack), ['orari']);
  });
  test('il pack può sovrascrivere con intent.contesto', () => {
    const p2 = { ...pack, intents: pack.intents.map((i) => (i.id === 'prenota_visita' ? { ...i, contesto: ['info'] } : i)) };
    assert.deepEqual(sezioniPerIntent('prenota_visita', p2), ['info']);
  });
});

describe('policy di autonomia', () => {
  test('default = comportamento storico', () => {
    assert.equal(valutaAzione({ agent: 'whatsapp', action: 'reply' }).esegue, true);
    assert.equal(valutaAzione({ agent: 'whatsapp', action: 'create_calendar_event' }).esegue, true);
    assert.equal(valutaAzione({ agent: 'whatsapp', action: 'handoff' }).esegue, true);
  });
  test('deny-by-default: azione sconosciuta = livello 1, non esegue', () => {
    const v = valutaAzione({ agent: 'whatsapp', action: 'cancella_tutto' });
    assert.equal(v.livello, 1); assert.equal(v.esegue, false); assert.equal(v.soloProposta, true); assert.equal(v.motivo, 'deny_by_default');
  });
  test('prezzi e cancellazione dati richiedono approvazione di default', () => {
    for (const a of ['edit_price', 'delete_data']) {
      const v = valutaAzione({ agent: 'dashboard', action: a });
      assert.equal(v.richiedeApprovazione, true); assert.equal(v.esegue, false);
    }
  });
  test('la riga del tenant ha priorità sul default', () => {
    const righe = [{ agent_id: 'whatsapp', action: 'create_calendar_event', autonomy_level: 4, condizioni: {} }];
    const v = valutaAzione({ righe, agent: 'whatsapp', action: 'create_calendar_event' });
    assert.equal(v.richiedeApprovazione, true); assert.equal(v.esegue, false); assert.equal(v.motivo, 'policy_tenant');
  });
  test('livello fuori range o non valido: ricade a 1', () => {
    assert.equal(valutaAzione({ righe: [{ agent_id: 'a', action: 'b', autonomy_level: 9 }], agent: 'a', action: 'b' }).livello, 1);
  });
  test('condizione non soddisfatta: livello 5 scende a 4', () => {
    const righe = [{ agent_id: 'followup', action: 'send_followup', autonomy_level: 5, condizioni: { richiede: 'campaign_approved' } }];
    assert.equal(valutaAzione({ righe, agent: 'followup', action: 'send_followup', contesto: {} }).livello, 4);
    assert.equal(valutaAzione({ righe, agent: 'followup', action: 'send_followup', contesto: { campaign_approved: true } }).livello, 5);
  });
  test('righe di un altro agente non si applicano', () => {
    const righe = [{ agent_id: 'followup', action: 'reply', autonomy_level: 0 }];
    assert.equal(valutaAzione({ righe, agent: 'whatsapp', action: 'reply' }).livello, DEFAULT['whatsapp:reply']);
  });
});

describe('gateway modello', () => {
  test('retry una volta su 500 e poi riesce', async () => {
    let n = 0;
    const f = async () => (++n === 1 ? { status: 500, json: async () => ({}) } : { status: 200, json: async () => ({ content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 1, output_tokens: 1 } }) });
    const r = await chiamaModello({ apiKey: 'k', fetchImpl: f, system: 's', messages: [] });
    assert.equal(n, 2); assert.equal(r.data.content[0].text, 'ok');
  });
  test('errore persistente: lancia (il chiamante usa il fallback)', async () => {
    await assert.rejects(chiamaModello({ apiKey: 'k', fetchImpl: async () => ({ status: 500, json: async () => ({}) }), system: 's', messages: [] }));
  });
  test('timeout: interrompe e non ritenta', async () => {
    let n = 0;
    const f = (url, o) => new Promise((_, rej) => { n++; o.signal.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' }))); });
    const t0 = Date.now();
    await assert.rejects(chiamaModello({ task: 'analisi', apiKey: 'k', fetchImpl: f, system: 's', messages: [] }));
    assert.equal(n, 1);
    assert.ok(Date.now() - t0 < 6500);
  });
  test('risposta senza contenuto: lancia', async () => {
    await assert.rejects(chiamaModello({ apiKey: 'k', fetchImpl: async () => ({ status: 200, json: async () => ({ error: { type: 'overloaded' } }) }), system: 's', messages: [] }), /senza contenuto/);
  });
});

describe('approvazioni e lineage', () => {
  test('risoluzione filtra per cliente_id e stato pending', async () => {
    let url;
    const f = async (u) => { url = u; return { json: async () => [] }; };
    const r = await risolviApprovazione({ SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl: f }, { cliente_id: 'A', id: 'x', decisione: 'approved', decided_by: 'owner' });
    assert.equal(r.ok, false);
    assert.ok(url.includes('cliente_id=eq.A') && url.includes('stato=eq.pending'));
  });
  test('decisione non valida rifiutata; tabella assente => null', async () => {
    assert.equal((await risolviApprovazione({ SUPABASE_URL: 'https://s.test', headers: {} }, { cliente_id: 'A', id: 'x', decisione: 'boh' })).ok, false);
    assert.equal(await richiediApprovazione({ SUPABASE_URL: 'https://s.test', headers: {}, fetchImpl: async () => { throw new Error('x'); } }, { cliente_id: 'A', agent: 'a', action: 'b', payload: {} }), null);
  });
  test('lineage: elenca solo ciò che è stato dato al modello, senza contenuti', () => {
    const f = fontiUsate({ sezioni: ['orari', 'servizi'], config: { orari_apertura: { l: 1 }, info_generali: { prezzi: 'SEGRETO 100' } }, servizi: [{ nome: 'x' }], caricato: { settore: 'dentista', version: 1 }, faqTrovata: { domanda_canonica: 'cos e' } });
    assert.deepEqual(f.map((x) => x.tipo), ['pack', 'faq_settore', 'orari_apertura', 'servizi']);
    assert.doesNotMatch(JSON.stringify(f), /SEGRETO/);
  });
});
