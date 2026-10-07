import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eseguiHarness, costruisciSonde } from '../lib/engine/harness.js';
import { caricaPackProduzione, svuotaCachePack } from '../lib/engine/pack.js';
import { caricaDefinizionePack, SETTORI_DISPONIBILI } from '../lib/engine/packs/registro.js';
import { gestisciAdminPack } from '../lib/admin/pack-http.js';

// Registry reali (letti da Supabase il 2026-10-07): agente whatsapp e azioni reply / handoff / emergency_escalation.
const AGENTI = [{ agent_id: 'whatsapp', attivo: true }];
const AZIONI_REG = [
  { action_id: 'reply', name: 'Reply to customer', risk_level: 'low', required_autonomy: 3, approval_required: false, executor: 'whatsapp.reply', executor_version: '1', active: true, metadata: { agent: 'whatsapp' } },
  { action_id: 'handoff', name: 'Handoff to staff', risk_level: 'medium', required_autonomy: 3, approval_required: false, executor: 'whatsapp.handoff', executor_version: '1', active: true, metadata: { agent: 'whatsapp' } },
  { action_id: 'emergency_escalation', name: 'Emergency escalation', risk_level: 'critical', required_autonomy: 5, approval_required: false, executor: 'whatsapp.emergency_escalation', executor_version: '1', active: true, metadata: { agent: 'whatsapp', safety: 'critical' } },
];

function dbFinto({ azioni = AZIONI_REG } = {}) {
  const t = { sector_profiles: [], sector_faq: [], agent_registry: [...AGENTI], action_registry: [...azioni], sector_pack_audit: [], tenant_action_policy: [] };
  const log = { scritture: 0, tabelleScritte: [] };
  const fetchImpl = async (url, o = {}) => {
    const u = new URL(url);
    const tab = u.pathname.split('/').pop();
    const risp = (status, corpo) => ({ ok: status < 300, status, json: async () => corpo, text: async () => JSON.stringify(corpo) });
    if ((o.method || 'GET') !== 'GET') {
      log.scritture++; log.tabelleScritte.push(tab);
      if (tab === 'sector_pack_audit' && o.method === 'POST') t.sector_pack_audit.push(JSON.parse(o.body));
      return risp(201, []);
    }
    const rows = t[tab];
    if (!rows) return risp(404, { error: 'tabella' });
    let r = rows.filter((x) => [...u.searchParams.entries()].every(([k, v]) => {
      const m = /^eq\.(.*)$/.exec(v);
      return !m || ['select', 'order', 'limit'].includes(k) || String(x[k]) === decodeURIComponent(m[1]);
    }));
    const ord = u.searchParams.get('order');
    if (ord) { const [c, d] = ord.split('.'); r = [...r].sort((a, b) => (a[c] - b[c]) * (d === 'desc' ? -1 : 1)); }
    const lim = Number(u.searchParams.get('limit') || 0);
    if (lim) r = r.slice(0, lim);
    return risp(200, r);
  };
  return { t, log, fetchImpl };
}

async function inserisci(db, settore, stato) {
  const d = await caricaDefinizionePack(settore);
  const id = db.t.sector_profiles.length + 1;
  db.t.sector_profiles.push({ id, settore, version: d.VERSIONE, status: stato, pack: d.pack });
  for (const f of d.faq) db.t.sector_faq.push({ settore, version: d.VERSIONE, status: stato, intent: f.intent, domanda_canonica: f.domanda_canonica, varianti: f.varianti || [], risposta_base: f.risposta_base, condizioni: f.condizioni || null });
  return d;
}

const ctx = (db) => ({ SUPABASE_URL: 'https://db.test', headers: { apikey: 'k', Authorization: 'Bearer k' }, fetchImpl: db.fetchImpl });

// ===== Tutti i 29 pack, in TEST, passano la prova end-to-end =====
for (const settore of SETTORI_DISPONIBILI) {
  test(`harness: ${settore} in TEST passa motore + governance, senza scritture`, async () => {
    const db = dbFinto();
    await inserisci(db, settore, 'test');
    const r = await eseguiHarness(ctx(db), settore);
    assert.deepEqual(r.fallite, [], JSON.stringify(r.fallite));
    assert.equal(r.ok, true, JSON.stringify(r.errori));
    assert.equal(r.scritture_db, 0);
    assert.equal(db.log.scritture, 0, 'nessuna scrittura sul database');
    assert.equal(r.stato_db_invariato, true);
    assert.equal(r.governance.DENY, 0);
    assert.ok(r.sonde >= 5);
  });
}

test('harness: lo stesso percorso del runtime — il pack in production caricato dall\'harness coincide con caricaPackProduzione', async () => {
  const db = dbFinto();
  await inserisci(db, 'dentista', 'production');
  svuotaCachePack();
  const reale = await caricaPackProduzione('https://db.test', ctx(db).headers, 'dentista', { fetchImpl: db.fetchImpl });
  const r = await eseguiHarness(ctx(db), 'dentista', { stato: 'production' });
  assert.equal(r.ok, true, JSON.stringify(r.errori));
  assert.equal(r.pack_version, reale.version);
  assert.equal(r.faq, reale.faq.length);
});

test('harness: un pack in TEST non è visibile al runtime reale (caricaPackProduzione)', async () => {
  const db = dbFinto();
  await inserisci(db, 'medico', 'test');
  svuotaCachePack();
  assert.equal(await caricaPackProduzione('https://db.test', ctx(db).headers, 'medico', { fetchImpl: db.fetchImpl }), null);
});

test('harness: il webhook non può caricare pack in TEST (non importa caricaPackPerHarness né l\'harness)', () => {
  const webhook = readFileSync(new URL('../api/whatsapp.js', import.meta.url), 'utf8');
  assert.doesNotMatch(webhook, /caricaPackPerHarness|engine\/harness/);
  assert.match(webhook, /caricaPackProduzione/);
});

test('harness: settore senza pack in TEST → non ok, nessuna scrittura', async () => {
  const db = dbFinto();
  const r = await eseguiHarness(ctx(db), 'medico');
  assert.equal(r.ok, false);
  assert.match(r.errori[0], /nessun pack valido/);
  assert.equal(db.log.scritture, 0);
});

test('harness: pack in TEST non valido → non ok', async () => {
  const db = dbFinto();
  await inserisci(db, 'medico', 'test');
  db.t.sector_profiles[0].pack = { ...db.t.sector_profiles[0].pack, intents: [] };
  const r = await eseguiHarness(ctx(db), 'medico');
  assert.equal(r.ok, false);
});

test('harness: stato non ammesso (draft/archived) → rifiutato', async () => {
  const db = dbFinto();
  await inserisci(db, 'medico', 'archived');
  const r = await eseguiHarness(ctx(db), 'medico', { stato: 'archived' });
  assert.equal(r.ok, false);
});

test('harness: se il registry di governance non ha l\'azione, la prova fallisce (deny-by-default)', async () => {
  const db = dbFinto({ azioni: AZIONI_REG.filter((a) => a.action_id !== 'emergency_escalation') });
  await inserisci(db, 'medico', 'test');
  const r = await eseguiHarness(ctx(db), 'medico');
  assert.equal(r.ok, false);
  assert.ok(r.governance.DENY > 0);
  assert.ok(r.fallite.some((f) => /unknown_action/.test(f.motivo)));
});

test('harness: le sonde vengono dal pack (nessun dato inventato) e coprono ogni intent', async () => {
  const d = await caricaDefinizionePack('estetista');
  const sonde = costruisciSonde(d.pack);
  for (const i of d.pack.intents) assert.ok(sonde.some((s) => s.codice === `intent:${i.id}`));
  assert.ok(sonde.some((s) => s.codice === 'urgenza_critica'));
  assert.ok(sonde.some((s) => s.codice === 'richiesta_persona'));
});

// ===== Endpoint amministrativo =====
const TOKEN = 'harness-token-di-prova-0123456789abcdefABCDEF';
const env = { PACK_ADMIN_TOKEN: TOKEN, SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const resFinta = () => { const r = { codice: null, corpo: null, setHeader() {}, status(c) { r.codice = c; return r; }, json(b) { r.corpo = b; return r; }, send(b) { r.corpo = b; return r; } }; return r; };
const chiama = async (db, body) => {
  const res = resFinta();
  await gestisciAdminPack({ method: 'POST', headers: {}, body }, res, { env, ctx: ctx(db), ritardoMs: 0 });
  return res;
};

test('endpoint harness: senza token 401, token errato 401, settore sconosciuto 400', async () => {
  const db = dbFinto();
  assert.equal((await chiama(db, { azione: 'harness', settore: 'medico' })).codice, 401);
  assert.equal((await chiama(db, { token: 'sbagliato', azione: 'harness', settore: 'medico' })).codice, 401);
  assert.equal((await chiama(db, { token: TOKEN, azione: 'harness', settore: 'inesistente' })).codice, 400);
});

test('endpoint harness: con token valido esegue la prova, non cambia nulla e lascia solo una riga di audit senza testi', async () => {
  const db = dbFinto();
  await inserisci(db, 'medico', 'test');
  const prima = JSON.stringify(db.t.sector_profiles) + JSON.stringify(db.t.sector_faq);
  const res = await chiama(db, { token: TOKEN, azione: 'harness', settore: 'medico' });
  assert.equal(res.codice, 200, JSON.stringify(res.corpo));
  assert.equal(res.corpo.ok, true);
  assert.equal(JSON.stringify(db.t.sector_profiles) + JSON.stringify(db.t.sector_faq), prima);
  assert.deepEqual([...new Set(db.log.tabelleScritte)], ['sector_pack_audit']);
  const riga = db.t.sector_pack_audit.find((x) => x.evento === 'verifica');
  assert.ok(riga && riga.dettaglio.harness && riga.dettaglio.scritture_db === 0);
  assert.doesNotMatch(JSON.stringify(res.corpo) + JSON.stringify(riga), new RegExp(TOKEN));
});

test('endpoint harness: pack non provabile → 422 e audit "rifiutato"', async () => {
  const db = dbFinto();
  const res = await chiama(db, { token: TOKEN, azione: 'harness', settore: 'medico' });
  assert.equal(res.codice, 422);
  assert.equal(db.t.sector_pack_audit.at(-1).esito, 'rifiutato');
});
