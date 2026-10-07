import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importaPack, promuoviVerificato, SETTORI_REGOLAMENTATI } from '../lib/admin/pack-pipeline.js';
import { gestisciAdminPack, PAGINA } from '../lib/admin/pack-http.js';
import { caricaPackProduzione, svuotaCachePack } from '../lib/engine/pack.js';
import { SETTORI_DISPONIBILI } from '../lib/engine/packs/registro.js';
import { dbFinto } from './helpers/db-pack-finto.js';

const TOKEN = 'S'.repeat(16) + 'serie-token-di-prova-0123456789abcdef';
const env = { PACK_ADMIN_TOKEN: TOKEN, SUPABASE_URL: 'https://finto.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', VERCEL_GIT_COMMIT_SHA: 'abc123' };
const resFinta = () => { const r = { codice: null, corpo: null, headers: {}, status(c) { r.codice = c; return r; }, json(b) { r.corpo = b; return r; }, send(b) { r.corpo = b; return r; }, setHeader() {} }; return r; };

// Registry reali di governance (agente whatsapp, azioni reply / handoff / emergency_escalation).
const dbConGovernance = () => {
  const db = dbFinto();
  db.t.agent_registry = [{ agent_id: 'whatsapp', attivo: true }];
  db.t.action_registry = ['reply', 'handoff', 'emergency_escalation'].map((a) => ({ action_id: a, name: a, risk_level: 'low', required_autonomy: a === 'emergency_escalation' ? 5 : 3, approval_required: false, executor: `whatsapp.${a}`, executor_version: '1', active: true, metadata: { agent: 'whatsapp' } }));
  db.t.tenant_action_policy = [];
  db.ctx.headers = { apikey: 'k', Authorization: 'Bearer k' };
  return db;
};
const stato = (db, s) => db.t.sector_profiles.find((p) => p.settore === s)?.status;
const chiama = async (db, body) => { const res = resFinta(); await gestisciAdminPack({ method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body }, res, { env, ctx: db.ctx, ritardoMs: 0 }); return res; };

test('i settori regolamentati sono tutti nel registro e il dentista (già in produzione) non è elencato', () => {
  for (const s of SETTORI_REGOLAMENTATI) assert.ok(SETTORI_DISPONIBILI.includes(s), s);
  assert.ok(!SETTORI_REGOLAMENTATI.includes('estetista'));
});

test('promuoviVerificato: settore regolamentato → rifiutato, resta in TEST, audit registrato', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'medico');
  const r = await promuoviVerificato(db.ctx, 'medico');
  assert.equal(r.ok, false);
  assert.equal(r.fase, 'regolamentato');
  assert.equal(stato(db, 'medico'), 'test');
  const riga = db.t.sector_pack_audit.filter((a) => a.evento === 'promozione').at(-1);
  assert.equal(riga.esito, 'rifiutato');
});

test('promuoviVerificato: settore non importato → rifiutato dall\'harness', async () => {
  const db = dbConGovernance();
  const r = await promuoviVerificato(db.ctx, 'immobiliare');
  assert.equal(r.ok, false);
  assert.equal(r.fase, 'harness');
});

test('promuoviVerificato: se l\'harness fallisce NON si promuove e il promotore non viene nemmeno chiamato', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'immobiliare');
  let chiamato = false;
  const r = await promuoviVerificato(db.ctx, 'immobiliare', {
    harness: async () => ({ ok: false, sonde: 5, sonde_passate: 4, fallite: [{ sonda: 'x', motivo: 'm' }], errori: ['1 sonde fallite'] }),
    promuovi: async () => { chiamato = true; return { ok: true }; },
  });
  assert.equal(r.ok, false);
  assert.equal(r.fase, 'harness');
  assert.equal(chiamato, false);
  assert.equal(stato(db, 'immobiliare'), 'test');
});

test('promuoviVerificato: percorso completo reale (harness + compatibilità + gate) → production, e il runtime lo serve', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'immobiliare');
  svuotaCachePack();
  assert.equal(await caricaPackProduzione('https://finto.supabase.co', db.ctx.headers, 'immobiliare', { fetchImpl: db.fetchImpl }), null);
  const r = await promuoviVerificato(db.ctx, 'immobiliare', { sha: 'abc123' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.fase, 'promosso');
  assert.equal(r.harness.sonde_passate, r.harness.sonde);
  assert.equal(r.harness.scritture_db, 0);
  assert.equal(stato(db, 'immobiliare'), 'production');
  assert.ok(db.t.sector_faq.filter((f) => f.settore === 'immobiliare').every((f) => f.status === 'production'));
  svuotaCachePack();
  const live = await caricaPackProduzione('https://finto.supabase.co', db.ctx.headers, 'immobiliare', { fetchImpl: db.fetchImpl });
  assert.ok(live && live.settore === 'immobiliare');
  assert.equal(db.t.sector_pack_audit.filter((a) => a.evento === 'promozione' && a.esito === 'ok').length, 1);
});

test('promuoviVerificato: nessuna promozione "per effetto collaterale" sugli altri settori', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'immobiliare');
  await importaPack(db.ctx, 'ristorante');
  await promuoviVerificato(db.ctx, 'immobiliare');
  assert.equal(stato(db, 'ristorante'), 'test');
});

test('endpoint: promuovi_verificato richiede il token, rifiuta settori sconosciuti, promuove con token valido', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'ristorante');
  assert.equal((await chiama(db, { azione: 'promuovi_verificato', settore: 'ristorante' })).codice, 401);
  assert.equal((await chiama(db, { token: TOKEN, azione: 'promuovi_verificato', settore: 'inesistente' })).codice, 400);
  assert.equal(stato(db, 'ristorante'), 'test');
  const ok = await chiama(db, { token: TOKEN, azione: 'promuovi_verificato', settore: 'ristorante' });
  assert.equal(ok.codice, 200, JSON.stringify(ok.corpo));
  assert.equal(stato(db, 'ristorante'), 'production');
  assert.doesNotMatch(JSON.stringify(ok.corpo), new RegExp(TOKEN));
});

test('endpoint: un settore regolamentato nella serie dà 422 e non cambia stato', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'avvocato');
  const r = await chiama(db, { token: TOKEN, azione: 'promuovi_verificato', settore: 'avvocato' });
  assert.equal(r.codice, 422);
  assert.equal(stato(db, 'avvocato'), 'test');
});

test('pagina: il modulo "Promuovi in serie" esiste, lo script è valido e separa i settori per virgola/spazio', () => {
  const html = PAGINA.replace('__SETTORI__', JSON.stringify(SETTORI_DISPONIBILI)).replace('__REGOLAMENTATI__', JSON.stringify(SETTORI_REGOLAMENTATI));
  assert.match(html, /b-serie/);
  assert.match(html, /promuovi_verificato/);
  const js = html.split('<script>')[1].split('</script>')[0];
  assert.doesNotThrow(() => new Function(js));
  const re = new Function(`return ${html.match(/split\((\/[^)]*)\)/)[1]}`)();
  assert.deepEqual('immobiliare, ristorante  bar_caffetteria'.split(re), ['immobiliare', 'ristorante', 'bar_caffetteria']);
});

// ===== Serie regolamentati con conferma esplicita =====
test('regolamentati: senza conferma (o con conferma non esatta) sempre rifiutati; stato invariato', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'medico');
  for (const conferma of [undefined, 'confermo', 'CONFERMO ', 'si', true, 'CONFERMO1']) {
    const body = { token: TOKEN, azione: 'promuovi_verificato', settore: 'medico', ...(conferma === undefined ? {} : { conferma_regolamentati: conferma }) };
    assert.equal((await chiama(db, body)).codice, 422, String(conferma));
  }
  assert.equal(stato(db, 'medico'), 'test');
});

test('regolamentati: con CONFERMO esatto si eseguono harness e controlli, si promuove e l\'audit registra la conferma', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'veterinario');
  const r = await chiama(db, { token: TOKEN, azione: 'promuovi_verificato', settore: 'veterinario', conferma_regolamentati: 'CONFERMO' });
  assert.equal(r.codice, 200, JSON.stringify(r.corpo));
  assert.equal(r.corpo.fase, 'promosso');
  assert.equal(r.corpo.harness.sonde_passate, r.corpo.harness.sonde);
  assert.equal(stato(db, 'veterinario'), 'production');
  const conferme = db.t.sector_pack_audit.filter((a) => a.evento === 'verifica' && a.dettaglio?.regolamentato_confermato === true);
  assert.equal(conferme.length, 1);
  assert.equal(conferme[0].settore, 'veterinario');
  assert.equal(db.t.sector_pack_audit.filter((a) => a.evento === 'promozione' && a.esito === 'ok').length, 1);
});

test('regolamentati: anche con CONFERMO, se l\'harness fallisce non si promuove', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'avvocato');
  const r = await promuoviVerificato(db.ctx, 'avvocato', {
    confermaRegolamentati: true,
    harness: async () => ({ ok: false, sonde: 3, sonde_passate: 2, fallite: [{ sonda: 'x', motivo: 'm' }], errori: ['1 sonde fallite'] }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.fase, 'harness');
  assert.equal(stato(db, 'avvocato'), 'test');
});

test('regolamentati: la conferma non promuove altri settori e non vale per quelli non importati', async () => {
  const db = dbConGovernance();
  await importaPack(db.ctx, 'medico');
  const r = await chiama(db, { token: TOKEN, azione: 'promuovi_verificato', settore: 'commercialista', conferma_regolamentati: 'CONFERMO' });
  assert.equal(r.codice, 422);
  assert.equal(stato(db, 'medico'), 'test');
});

test('pagina: il modulo "Serie regolamentati" esiste, chiede CONFERMO e lo script è valido', () => {
  const html = PAGINA.replace('__SETTORI__', JSON.stringify(SETTORI_DISPONIBILI)).replace('__REGOLAMENTATI__', JSON.stringify(SETTORI_REGOLAMENTATI));
  assert.match(html, /b-serie-reg/);
  assert.match(html, /Scrivi CONFERMO/);
  assert.match(html, /conferma_regolamentati/);
  const js = html.split('<script>')[1].split('</script>')[0];
  assert.doesNotThrow(() => new Function(js));
});
