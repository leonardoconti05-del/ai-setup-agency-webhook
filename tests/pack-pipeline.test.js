import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importaPack, promuoviPack, sospendiPack, verificaImport, verificaCompatibilita, analizza, hashContenuto } from '../lib/admin/pack-pipeline.js';
import { gestisciAdminPack, tokenValido } from '../lib/admin/pack-http.js';
import { caricaDefinizionePack, SETTORI_DISPONIBILI } from '../lib/engine/packs/registro.js';
import { PRIMO_GIRO_HOLDOUT } from '../lib/engine/packs/primo-giro-holdout.js';
import { SETTORI } from '../lib/settori.js';
import { caricaPackProduzione, svuotaCachePack } from '../lib/engine/pack.js';
import { eseguiMotore } from '../lib/engine/orchestratore.js';

const TOKEN = 'T'.repeat(16) + 'segreto-di-prova-0123456789abcdef';

import { dbFinto } from './helpers/db-pack-finto.js';
const resFinta = () => { const r = { codice: null, corpo: null, headers: {}, status(c) { r.codice = c; return r; }, json(b) { r.corpo = b; return r; }, send(b) { r.corpo = b; return r; }, setHeader(k, v) { r.headers[k] = v; } }; return r; };
const reqPost = (body, ip = '1.2.3.4') => ({ method: 'POST', body, headers: { 'x-forwarded-for': ip } });
const envOk = { PACK_ADMIN_TOKEN: TOKEN, SUPABASE_URL: 'https://finto.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', VERCEL_GIT_COMMIT_SHA: 'abc123' };

// ===== dati e metadata =====
test('29 settori attesi: registro = lib/settori.js, primo giro registrato e coerente con gli holdout', async () => {
  assert.equal(SETTORI_DISPONIBILI.length, 29);
  assert.deepEqual([...SETTORI_DISPONIBILI].sort(), Object.keys(SETTORI).sort());
  for (const s of SETTORI_DISPONIBILI) {
    const d = await caricaDefinizionePack(s);
    assert.equal(PRIMO_GIRO_HOLDOUT[s].totale, d.scenariHoldout.length, s);
  }
});
test('analizza: rifiuta pack senza FAQ/holdout, settore errato, codici duplicati', async () => {
  const d = await caricaDefinizionePack('ristorante');
  assert.equal(analizza('ristorante', d).ok, true);
  assert.equal(analizza('ristorante', { ...d, faq: [] }).ok, false);
  assert.equal(analizza('ristorante', { ...d, scenariHoldout: [] }).ok, false);
  assert.equal(analizza('ristorante', { ...d, SETTORE: 'altro' }).ok, false);
  assert.equal(analizza('ristorante', { ...d, scenariHoldout: [d.scenari[0]] }).ok, false);
  assert.equal(analizza('inesistente', d).ok, false);
  assert.equal(analizza('ristorante', null).ok, false);
});

// ===== endpoint: deny-by-default =====
test('GET mostra solo il modulo, nessun segreto', async () => {
  const res = resFinta();
  await gestisciAdminPack({ method: 'GET', headers: {} }, res, { env: envOk });
  assert.equal(res.codice, 200);
  assert.ok(!String(res.corpo).includes(TOKEN));
  assert.match(res.headers['Content-Security-Policy'], /default-src 'none'/);
});
test('token non configurato o troppo corto → 503; metodo errato → 405', async () => {
  const { ctx } = dbFinto();
  for (const env of [{ ...envOk, PACK_ADMIN_TOKEN: undefined }, { ...envOk, PACK_ADMIN_TOKEN: 'corto' }]) {
    const res = resFinta();
    await gestisciAdminPack(reqPost({ token: 'corto', azione: 'verifica' }), res, { env, ctx });
    assert.equal(res.codice, 503);
  }
  const res = resFinta();
  await gestisciAdminPack({ method: 'PUT', headers: {} }, res, { env: envOk, ctx });
  assert.equal(res.codice, 405);
});
test('senza token o con token errato → 401, mai nel db né nelle risposte; il fallo viene registrato', async () => {
  const db = dbFinto();
  for (const body of [{ azione: 'verifica' }, { token: 'sbagliato', azione: 'verifica' }, { token: 123, azione: 'verifica' }]) {
    const res = resFinta();
    await gestisciAdminPack(reqPost(body), res, { env: envOk, ctx: db.ctx, ritardoMs: 0 });
    assert.equal(res.codice, 401);
    assert.ok(!JSON.stringify(res.corpo).includes(TOKEN));
  }
  assert.equal(db.t.sector_pack_audit.filter((r) => r.evento === 'auth_failed').length, 3);
  assert.ok(!JSON.stringify(db.t).includes('sbagliato'));
  assert.ok(!JSON.stringify(db.t).includes(TOKEN));
});
test('payload non valido → 400; azione o settore sconosciuti → 400', async () => {
  const db = dbFinto();
  const prova = async (req) => { const res = resFinta(); await gestisciAdminPack(req, res, { env: envOk, ctx: db.ctx, ritardoMs: 0 }); return res; };
  assert.equal((await prova(reqPost('non json'))).codice, 400);
  assert.equal((await prova(reqPost([]))).codice, 400);
  assert.equal((await prova(reqPost({ token: TOKEN, azione: 'cancella_tutto', settore: 'ristorante' }))).codice, 400);
  assert.equal((await prova(reqPost({ token: TOKEN, azione: 'importa', settore: 'pizzeria' }))).codice, 400);
  assert.equal((await prova(reqPost({ token: TOKEN, azione: 'importa', settore: '../../etc' }))).codice, 400);
});
test('rate limiting: troppi tentativi dallo stesso IP → 429, anche col token giusto', async () => {
  const db = dbFinto();
  let ultimo;
  for (let i = 0; i < 10; i++) { ultimo = resFinta(); await gestisciAdminPack(reqPost({ token: 'x' + i, azione: 'verifica' }, '9.9.9.9'), ultimo, { env: envOk, ctx: db.ctx, ritardoMs: 0 }); }
  assert.equal(ultimo.codice, 429);
  const buono = resFinta();
  await gestisciAdminPack(reqPost({ token: TOKEN, azione: 'verifica' }, '9.9.9.9'), buono, { env: envOk, ctx: db.ctx, ritardoMs: 0 });
  assert.equal(buono.codice, 429);
});
test('blocco globale persistente dopo molti tentativi falliti (altri IP)', async () => {
  const db = dbFinto();
  for (let i = 0; i < 20; i++) db.t.sector_pack_audit.push({ id: i + 1000, evento: 'auth_failed', created_at: new Date().toISOString() });
  const res = resFinta();
  await gestisciAdminPack(reqPost({ token: TOKEN, azione: 'verifica' }, '7.7.7.7'), res, { env: envOk, ctx: db.ctx, ritardoMs: 0 });
  assert.equal(res.codice, 429);
});
test('tokenValido: confronto a tempo costante, rifiuta tipi errati', () => {
  assert.equal(tokenValido(TOKEN, TOKEN), true);
  assert.equal(tokenValido(TOKEN + 'x', TOKEN), false);
  assert.equal(tokenValido(undefined, TOKEN), false);
  assert.equal(tokenValido('', ''), false);
});
test('senza la tabella di audit nessuna scrittura parte (fail-closed)', async () => {
  const db = dbFinto();
  delete db.t.sector_pack_audit;
  const res = resFinta();
  await gestisciAdminPack(reqPost({ token: TOKEN, azione: 'importa', settore: 'ristorante' }), res, { env: envOk, ctx: db.ctx, ritardoMs: 0 });
  assert.equal(res.codice, 503);
  assert.equal(db.t.sector_profiles.length, 0);
});

// ===== import, idempotenza, promozione =====
test('import via endpoint: crea in TEST (mai ACTIVE), con FAQ, scenari, holdout, valutazione e audit; il token non compare', async () => {
  const db = dbFinto();
  const res = resFinta();
  await gestisciAdminPack(reqPost({ token: TOKEN, azione: 'importa', settore: 'ristorante' }), res, { env: envOk, ctx: db.ctx, ritardoMs: 0 });
  assert.equal(res.codice, 200, JSON.stringify(res.corpo));
  assert.equal(res.corpo.stato, 'test');
  const d = await caricaDefinizionePack('ristorante');
  assert.equal(db.t.sector_profiles.length, 1);
  assert.equal(db.t.sector_profiles[0].status, 'test');
  assert.equal(db.t.sector_faq.length, d.faq.length);
  assert.ok(db.t.sector_faq.every((x) => x.status === 'test'));
  assert.equal(db.t.sector_test_scenarios.length, d.scenari.length + d.scenariHoldout.length);
  assert.equal(db.t.sector_test_scenarios.filter((x) => x.scenario.holdout === true).length, d.scenariHoldout.length);
  assert.equal(db.t.sector_eval_runs.length, 1);
  assert.equal(db.t.sector_eval_runs[0].gate_passed, true);
  assert.deepEqual(db.t.sector_eval_runs[0].metriche.holdout_primo_giro, PRIMO_GIRO_HOLDOUT.ristorante);
  const a = db.t.sector_pack_audit.at(-1);
  assert.equal(a.evento, 'import'); assert.equal(a.esito, 'ok'); assert.equal(a.stato_dopo, 'test');
  assert.equal(a.commit_sha, 'abc123'); assert.equal(a.n_faq, d.faq.length); assert.equal(a.n_holdout, d.scenariHoldout.length);
  assert.deepEqual(a.holdout_primo_giro, PRIMO_GIRO_HOLDOUT.ristorante);
  assert.ok(!JSON.stringify(db.t).includes(TOKEN));
  assert.ok(!JSON.stringify(res.corpo).includes(TOKEN));
});
test('idempotenza: secondo import = invariato, nessun duplicato; dopo una modifica del pack si aggiorna senza duplicare', async () => {
  const db = dbFinto();
  assert.equal((await importaPack(db.ctx, 'ristorante')).esito, 'ok');
  const n1 = [db.t.sector_profiles.length, db.t.sector_faq.length, db.t.sector_test_scenarios.length, db.t.sector_eval_runs.length];
  assert.equal((await importaPack(db.ctx, 'ristorante')).esito, 'invariato');
  assert.deepEqual([db.t.sector_profiles.length, db.t.sector_faq.length, db.t.sector_test_scenarios.length, db.t.sector_eval_runs.length], n1);
  const d = await caricaDefinizionePack('ristorante');
  const modificato = { ...d, CHANGELOG: 'x', pack: { ...d.pack, mission: d.pack.mission + ' (rev)' } };
  assert.equal((await importaPack(db.ctx, 'ristorante', { caricaDef: async () => modificato })).esito, 'ok');
  assert.equal(db.t.sector_profiles.length, 1);
  assert.equal(db.t.sector_faq.length, d.faq.length);
  assert.equal(db.t.sector_test_scenarios.length, d.scenari.length + d.scenariHoldout.length);
});
test('un profilo già ACTIVE non viene toccato dall\'import', async () => {
  const db = dbFinto();
  db.t.sector_profiles.push({ id: 'p1', settore: 'dentista', version: 1, status: 'production', pack: { marcatore: 'originale' } });
  const r = await importaPack(db.ctx, 'dentista');
  assert.equal(r.esito, 'saltato');
  assert.deepEqual(db.t.sector_profiles[0].pack, { marcatore: 'originale' });
  assert.equal(db.t.sector_faq.length, 0);
});
test('promozione TEST → ACTIVE: ricontrolla sul db, aggiorna profilo e FAQ, audit', async () => {
  const db = dbFinto();
  await importaPack(db.ctx, 'ristorante');
  const compat = await verificaCompatibilita(db.ctx, 'ristorante');
  assert.equal(compat.ok, true, JSON.stringify(compat));
  const r = await promuoviPack(db.ctx, 'ristorante', { sha: 'abc123' });
  assert.equal(r.esito, 'ok', JSON.stringify(r));
  assert.equal(db.t.sector_profiles[0].status, 'production');
  assert.ok(db.t.sector_faq.every((x) => x.status === 'production'));
  assert.equal(db.t.sector_pack_audit.at(-1).evento, 'promozione');
  assert.equal(db.t.sector_pack_audit.at(-1).stato_dopo, 'production');
  // una seconda promozione parte solo da TEST
  assert.equal((await promuoviPack(db.ctx, 'ristorante')).esito, 'rifiutato');
  // sospensione
  assert.equal((await sospendiPack(db.ctx, 'ristorante')).stato, 'archived');
  assert.equal(db.t.sector_profiles[0].status, 'archived');
});
test('promozione rifiutata: non importato, pack nel db diverso dal codice', async () => {
  const db = dbFinto();
  assert.equal((await promuoviPack(db.ctx, 'ristorante')).esito, 'rifiutato');
  await importaPack(db.ctx, 'ristorante');
  db.t.sector_profiles[0].pack = { ...db.t.sector_profiles[0].pack, mission: 'manomesso' };
  const r = await promuoviPack(db.ctx, 'ristorante');
  assert.equal(r.esito, 'rifiutato');
  assert.match(r.motivo, /non coincide/);
  assert.equal(db.t.sector_profiles[0].status, 'test');
});
test('quality gate fallito: resta in TEST, mai ACTIVE (anche se importato)', async () => {
  const db = dbFinto();
  const d = await caricaDefinizionePack('ristorante');
  const rotto = { ...d, scenari: d.scenari.map((s, i) => (i < 30 ? { ...s, scenario: { ...s.scenario, expected: { ...s.scenario.expected, intent: 'intent_inesistente' } } } : s)) };
  const imp = await importaPack(db.ctx, 'ristorante', { caricaDef: async () => rotto });
  assert.equal(imp.esito, 'ok');
  assert.equal(imp.gate, false);
  assert.equal(db.t.sector_profiles[0].status, 'test');
  const r = await promuoviPack(db.ctx, 'ristorante', { caricaDef: async () => rotto });
  assert.equal(r.esito, 'rifiutato');
  assert.match(r.motivo, /gate/);
  assert.equal(db.t.sector_profiles[0].status, 'test');
  // anche forzando il database: il trigger rifiuta senza gate superato
  const forzato = await db.fetchImpl(`${db.ctx.SUPABASE_URL}/rest/v1/sector_profiles?id=eq.${db.t.sector_profiles[0].id}`, { method: 'PATCH', body: JSON.stringify({ status: 'production' }) });
  assert.equal(forzato.ok, false);
});
test('pack non valido: import rifiutato, nulla viene scritto, audit registrato', async () => {
  const db = dbFinto();
  const d = await caricaDefinizionePack('ristorante');
  const r = await importaPack(db.ctx, 'ristorante', { caricaDef: async () => ({ ...d, faq: [] }) });
  assert.equal(r.esito, 'rifiutato');
  assert.equal(db.t.sector_profiles.length, 0);
  assert.equal(db.t.sector_pack_audit.at(-1).esito, 'rifiutato');
});

// ===== il percorso completo sui 29 settori =====
test('import di tutti i 29 settori e verifica: 29/29/29/29/29/0, nulla ACTIVE, rilanciabile', { timeout: 300000 }, async () => {
  const db = dbFinto();
  for (const s of SETTORI_DISPONIBILI) {
    const r = await importaPack(db.ctx, s, { sha: 'abc123' });
    assert.equal(r.esito, 'ok', `${s}: ${JSON.stringify(r)}`);
    assert.equal(r.gate, true, s);
  }
  const v = await verificaImport(db.ctx);
  assert.deepEqual(v.righe, ['29 settori attesi', '29 settori trovati', '29 pack validati', '29 pack in TEST', '29 pack con metadata coerenti', '0 duplicati']);
  assert.equal(v.ok, true);
  assert.equal(db.t.sector_profiles.filter((p) => p.status === 'production').length, 0);
  // seconda esecuzione: tutto invariato, stessi conteggi
  const prima = [db.t.sector_profiles.length, db.t.sector_faq.length, db.t.sector_test_scenarios.length];
  for (const s of SETTORI_DISPONIBILI) assert.equal((await importaPack(db.ctx, s)).esito, 'invariato', s);
  assert.deepEqual([db.t.sector_profiles.length, db.t.sector_faq.length, db.t.sector_test_scenarios.length], prima);
  // compatibilità runtime di tutti i pack in TEST
  for (const s of SETTORI_DISPONIBILI) assert.equal((await verificaCompatibilita(db.ctx, s, { registra: false })).ok, true, s);
});
test('hashContenuto è stabile rispetto all\'ordine delle chiavi', () => {
  assert.equal(hashContenuto({ a: 1, b: { c: 2, d: 3 } }), hashContenuto({ b: { d: 3, c: 2 }, a: 1 }));
});

test('percorso completo fino al runtime: TEST non viene servito, ACTIVE sì (stessa lettura del webhook), poi il motore risponde', async () => {
  const db = dbFinto();
  svuotaCachePack();
  await importaPack(db.ctx, 'ristorante');
  const letto = () => { svuotaCachePack(); return caricaPackProduzione(db.ctx.SUPABASE_URL, {}, 'ristorante', { fetchImpl: db.fetchImpl }); };
  assert.equal(await letto(), null, 'un pack in TEST non deve arrivare al runtime');
  assert.equal((await promuoviPack(db.ctx, 'ristorante')).esito, 'ok');
  const caricato = await letto();
  assert.ok(caricato && caricato.pack && caricato.faq.length > 0, 'il pack ACTIVE deve essere caricabile dal runtime');
  const esito = await eseguiMotore({
    caricato, config: { google_calendar_id: null }, nomeAttivita: 'Locale di prova', history: [{ role: 'user', content: 'Ciao, vorrei prenotare un tavolo per domani sera' }],
    messaggio: 'Ciao, vorrei prenotare un tavolo per domani sera', apiKey: null, campiTenant: ['nome_cliente'],
  });
  assert.ok(esito.reply && esito.reply.length > 0);
  assert.equal(esito.telemetria.origine_risposta === 'llm', false, 'senza chiave API il motore usa il fallback sicuro, non il modello');
  // sospeso → torna fuori dal runtime
  await sospendiPack(db.ctx, 'ristorante');
  assert.equal(await letto(), null);
});
