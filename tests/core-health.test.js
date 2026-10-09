// Contratto di salute di Core (sola lettura) per Jarvis: lib/core/health.js e lib/core/health-http.js.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPlatformContext, createTenantContext, createHealthReport } from '../lib/core/contracts.js';
import { getCoreHealth, creaLettore, TABELLE_LEGGIBILI } from '../lib/core/health.js';
import { gestisciCoreHealth } from '../lib/core/health-http.js';

const ADESSO = new Date('2026-10-09T12:00:00Z');
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const piatt = createPlatformContext({ actor: 'jarvis', agent: 'jarvis', requestId: 'r1', authorizationSource: 't' });
const ctxA = createTenantContext({ clienteId: A, actor: 'jarvis', agent: 'jarvis', requestId: 'r2', authorizationSource: 't' });

// Database finto: applica i filtri eq.* e registra ogni lettura.
function dbFinto(tabelle) {
  const letture = [];
  const leggi = async (tabella, query = '') => {
    letture.push({ tabella, query });
    const righe = tabelle[tabella];
    if (righe instanceof Error) throw righe;
    let out = righe || [];
    for (const f of query.split('&').filter((x) => /^[a-z_]+=eq\./.test(x))) {
      const [k, v] = f.split('=eq.');
      out = out.filter((r) => k in r ? String(r[k]) === decodeURIComponent(v) : true);
    }
    return out;
  };
  return { leggi, letture };
}
const profili = [
  { id: 'p1', settore: 'ristorante', version: 1, status: 'production' },
  { id: 'p2', settore: 'medico', version: 1, status: 'test' },
];
const sano = () => ({
  sector_profiles: profili, sector_eval_runs: [{ profile_id: 'p1' }], sector_pack_audit: [{ created_at: '2026-10-09T10:00:00Z', evento: 'verifica', esito: 'ok' }],
  clienti: [{ id: A }, { id: B }], event_log: [], approval_requests: [], lacune_conoscenza: [], documents: [], knowledge_chunks: [],
  configurazioni_cliente: [{ cliente_id: A, settore: 'ristorante', attivo: true }, { cliente_id: B, settore: 'medico', attivo: true }],
});

describe('rapporto di piattaforma', () => {
  test('stato sano: tutti i controlli ok, read_only, nessun tenant nominato', async () => {
    const { leggi } = dbFinto(sano());
    const r = await getCoreHealth(piatt, leggi, { adesso: ADESSO });
    assert.equal(r.status, 'ok');
    assert.equal(r.scope, 'platform');
    assert.equal(r.tenant_id, null);
    assert.equal(r.read_only, true);
    assert.equal(r.data.tenants.totale, 2);
    assert.deepEqual(r.data.packs.per_stato, { production: 1, test: 1 });
    assert.ok(!JSON.stringify(r).includes(A) && !JSON.stringify(r).includes(B), 'il rapporto di piattaforma non contiene id di tenant');
  });
  test('pack in production senza valutazione superata → fail', async () => {
    const db = sano(); db.sector_eval_runs = [];
    const r = await getCoreHealth(piatt, dbFinto(db).leggi, { adesso: ADESSO });
    assert.equal(r.status, 'fail');
    assert.deepEqual(r.data.packs.production_senza_gate, ['ristorante']);
  });
  test('settore regolamentato in production → warn (revisione professionale)', async () => {
    const db = sano(); db.sector_profiles = [...profili, { id: 'p3', settore: 'avvocato', version: 1, status: 'production' }]; db.sector_eval_runs = [{ profile_id: 'p1' }, { profile_id: 'p3' }];
    const r = await getCoreHealth(piatt, dbFinto(db).leggi, { adesso: ADESSO });
    assert.equal(r.status, 'warn');
    assert.deepEqual(r.data.packs.regolamentati_in_production, ['avvocato']);
  });
  test('errori e accessi amministrativi falliti nelle ultime 24 ore alzano lo stato', async () => {
    const db = sano();
    db.event_log = [{ fase: 'claude', stato: 'errore' }];
    db.sector_pack_audit = Array.from({ length: 5 }, () => ({ created_at: '2026-10-09T11:00:00Z', evento: 'auth_failed', esito: 'rifiutato' }));
    const r = await getCoreHealth(piatt, dbFinto(db).leggi, { adesso: ADESSO });
    assert.equal(r.status, 'warn');
    assert.equal(r.checks.find((c) => c.id === 'errors_24h').status, 'warn');
    assert.equal(r.checks.find((c) => c.id === 'pack_audit').status, 'warn');
  });
  test('una lettura fallita non diventa mai «ok»: il controllo è unknown e il resto prosegue', async () => {
    const db = sano(); db.event_log = new Error('boom https://segreto.example/x');
    const r = await getCoreHealth(piatt, dbFinto(db).leggi, { adesso: ADESSO });
    const c = r.checks.find((x) => x.id === 'errors_24h');
    assert.equal(c.status, 'unknown');
    assert.equal(r.status, 'unknown');
    assert.equal(r.checks.find((x) => x.id === 'sector_packs').status, 'ok');
  });
});

describe('rapporto di tenant e isolamento', () => {
  test('ogni lettura legata al tenant porta il filtro cliente_id', async () => {
    const { leggi, letture } = dbFinto(sano());
    await getCoreHealth(ctxA, leggi, { adesso: ADESSO });
    for (const l of letture.filter((x) => ['event_log', 'approval_requests', 'lacune_conoscenza', 'documents', 'knowledge_chunks', 'configurazioni_cliente'].includes(x.tabella))) {
      assert.match(l.query, new RegExp(`cliente_id=eq\\.${A}`), `${l.tabella} senza filtro tenant`);
    }
    assert.ok(!letture.some((l) => l.tabella === 'clienti'), 'il rapporto di tenant non elenca i clienti');
    assert.ok(!letture.some((l) => l.tabella === 'sector_pack_audit'), 'il rapporto di tenant non legge l\'audit di piattaforma');
  });
  test('il tenant A vede solo i propri numeri, mai quelli del tenant B', async () => {
    const db = sano();
    db.event_log = [{ cliente_id: A, fase: 'claude', stato: 'errore' }, { cliente_id: B, fase: 'claude', stato: 'errore' }, { cliente_id: B, fase: 'twilio', stato: 'errore' }];
    db.documents = [{ cliente_id: B, id: 1 }, { cliente_id: B, id: 2 }];
    const r = await getCoreHealth(ctxA, dbFinto(db).leggi, { adesso: ADESSO });
    assert.equal(r.scope, 'tenant');
    assert.equal(r.tenant_id, A);
    assert.equal(r.data.errori_24h.totale, 1);
    assert.equal(r.data.knowledge.documenti, 0);
    assert.ok(!JSON.stringify(r).includes(B));
  });
  test('contesto tenant senza cliente_id → errore, non un rapporto di piattaforma', async () => {
    await assert.rejects(() => getCoreHealth({ request_id: 'x', scope: 'tenant', cliente_id: null }, dbFinto(sano()).leggi), /cliente_id/);
  });
});

describe('sola lettura e riservatezza', () => {
  test('il lettore accetta solo GET e solo tabelle in lista chiusa', async () => {
    const metodi = [];
    const leggi = creaLettore({ SUPABASE_URL: 'https://x.example', headers: {}, fetchImpl: async (u, o) => { metodi.push(o.method); return { ok: true, json: async () => [] }; } });
    await leggi('event_log', 'select=fase');
    assert.deepEqual(metodi, ['GET']);
    await assert.rejects(() => leggi('jarvis_summaries'), /non consentita/);
    await assert.rejects(() => leggi('whatsapp_conversations'), /non consentita/);
    await assert.rejects(() => leggi('event_log', 'select=*;delete from x'), /non valida/);
    assert.ok(!TABELLE_LEGGIBILI.some((t) => ['whatsapp_conversations', 'richieste_clienti', 'richieste_pazienti', 'jarvis_summaries', 'personale_cliente', 'servizi_cliente'].includes(t)), 'nessuna tabella con testo libero o dati personali');
  });
  test('il codice del contratto non contiene scritture', () => {
    for (const f of ['lib/core/health.js', 'lib/core/health-http.js']) {
      const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      assert.doesNotMatch(src, /method:\s*['"](POST|PATCH|PUT|DELETE)['"]/i, f);
      assert.doesNotMatch(src, /\b(insert into|update\s+\w+\s+set|delete from)\b/i, f);
    }
  });
  test('nessun campo di testo libero o dato personale nei rapporti', async () => {
    const db = sano();
    db.event_log = [{ cliente_id: A, fase: 'claude', stato: 'errore', telefono: '+39333', dettaglio: { testo: 'messaggio privato' } }];
    for (const ctx of [piatt, ctxA]) {
      const j = JSON.stringify(await getCoreHealth(ctx, dbFinto(db).leggi, { adesso: ADESSO }));
      assert.doesNotMatch(j, /\+39333|messaggio privato|telefono|dettaglio"/);
    }
  });
  test('createHealthReport: stato peggiore e controlli validati', () => {
    const r = createHealthReport({ context: piatt, checks: [{ id: 'a', status: 'ok' }, { id: 'b', status: 'fail', detail: 'x' }] });
    assert.equal(r.status, 'fail');
    assert.throws(() => createHealthReport({ context: piatt, checks: [{ id: 'a', status: 'boh' }] }));
    assert.throws(() => createPlatformContext({ actor: 'a', agent: 'b' }));
  });
});

describe('endpoint /api/core-health', () => {
  const TOKEN = 'T'.repeat(40);
  const env = { CORE_HEALTH_TOKEN: TOKEN, SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'chiave-di-servizio-finta' };
  const res = () => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
  const chiamate = [];
  const fetchImpl = async (url, o) => { chiamate.push({ url, method: o.method }); return { ok: true, json: async () => [] }; };
  const req = (extra = {}) => ({ method: 'GET', headers: { authorization: `Bearer ${TOKEN}` }, query: {}, ...extra });

  test('senza token configurato → 503 (chiuso)', async () => {
    const r = res(); await gestisciCoreHealth(req(), r, { env: { ...env, CORE_HEALTH_TOKEN: undefined }, fetchImpl });
    assert.equal(r.code, 503);
  });
  test('token corto → 503; token errato o assente → 401', async () => {
    let r = res(); await gestisciCoreHealth(req(), r, { env: { ...env, CORE_HEALTH_TOKEN: 'corto' }, fetchImpl }); assert.equal(r.code, 503);
    r = res(); await gestisciCoreHealth(req({ headers: { authorization: 'Bearer sbagliato' } }), r, { env, fetchImpl }); assert.equal(r.code, 401);
    r = res(); await gestisciCoreHealth(req({ headers: {} }), r, { env, fetchImpl }); assert.equal(r.code, 401);
  });
  test('il token nell\'URL non è accettato', async () => {
    const r = res(); await gestisciCoreHealth(req({ headers: {}, query: { token: TOKEN } }), r, { env, fetchImpl });
    assert.equal(r.code, 401);
  });
  test('metodi diversi da GET → 405', async () => {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) { const r = res(); await gestisciCoreHealth(req({ method: m }), r, { env, fetchImpl }); assert.equal(r.code, 405, m); }
  });
  test('cliente_id non valido → 400', async () => {
    const r = res(); await gestisciCoreHealth(req({ query: { cliente_id: 'non-un-uuid' } }), r, { env, fetchImpl });
    assert.equal(r.code, 400);
  });
  test('richiesta valida → 200, solo GET verso il database, nessun segreto nella risposta', async () => {
    chiamate.length = 0;
    const r = res(); await gestisciCoreHealth(req(), r, { env, fetchImpl, adesso: ADESSO });
    assert.equal(r.code, 200);
    assert.equal(r.body.kind, 'core_health');
    assert.equal(r.headers['Cache-Control'], 'no-store');
    assert.ok(chiamate.length > 0 && chiamate.every((c) => c.method === 'GET'));
    const j = JSON.stringify(r.body);
    assert.ok(!j.includes(TOKEN) && !j.includes('chiave-di-servizio-finta') && !j.includes('db.example'));
  });
  test('con cliente_id valido produce un rapporto di tenant', async () => {
    const r = res(); await gestisciCoreHealth(req({ query: { cliente_id: A.toUpperCase() } }), r, { env, fetchImpl, adesso: ADESSO });
    assert.equal(r.code, 200);
    assert.equal(r.body.scope, 'tenant');
    assert.equal(r.body.tenant_id, A);
  });
  test('wiring: rewrite in vercel.json e ramo nella funzione esistente (limite di 12 funzioni)', () => {
    const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
    assert.ok(v.rewrites.some((x) => x.source === '/api/core-health' && x.destination === '/api/cron/retention?modo=core-health'));
    assert.match(readFileSync(new URL('../api/cron/retention.js', import.meta.url), 'utf8'), /modo === 'core-health'/);
  });
});

describe('migration jarvis_summaries (ambito esplicito)', () => {
  const sql = readFileSync(new URL('../migrations/20261009050000_jarvis_summaries_scope.sql', import.meta.url), 'utf8').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').toLowerCase();
  test('additiva, idempotente, senza grant né policy', () => {
    assert.match(sql, /add column if not exists scope text not null default 'agenzia'/);
    assert.match(sql, /add column if not exists cliente_id uuid references public\.clienti\(id\) on delete cascade/);
    assert.match(sql, /\(scope = 'agenzia' and cliente_id is null\) or \(scope = 'tenant' and cliente_id is not null\)/);
    assert.doesNotMatch(sql, /\bgrant\b|create policy|drop |truncate|delete from|update public/);
  });
});
