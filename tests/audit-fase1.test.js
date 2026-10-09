// Audit fase 1 (9/10/2026): controlli statici sulle migration di privilegi e copertura dei test dei pack noleggio/giardiniere.
// I controlli sul database vero stanno in supabase/tests/database/ (pgTAP) e in scripts/db-local/run-audit-check.sh.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const leggi = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const senzaCommenti = (sql) => sql.split('\n').filter((r) => !r.trim().startsWith('--')).join('\n').toLowerCase();

describe('migration privilegi audit', () => {
  const sql = senzaCommenti(leggi('migrations/20261009040000_audit_privileges_hardening.sql'));
  test('anon e authenticated perdono ogni privilegio su sector_pack_audit', () => {
    assert.match(sql, /revoke all on table public\.sector_pack_audit from anon, authenticated/);
  });
  test('service_role resta solo con select e insert (append-only, scrittura legittima del backend)', () => {
    assert.match(sql, /revoke all on table public\.sector_pack_audit from service_role/);
    assert.match(sql, /grant select, insert on table public\.sector_pack_audit to service_role/);
    assert.doesNotMatch(sql, /grant [^;]*(update|delete|truncate|all)[^;]*sector_pack_audit/);
  });
  test('sulle sette tabelle service_role perde solo i privilegi di struttura, mai quelli sui dati', () => {
    assert.match(sql, /revoke %s on table public\.%i from service_role/);
    assert.match(sql, /strutturali text := 'truncate, references, trigger'/);
    const ciclo = sql.slice(sql.indexOf('foreach'));
    assert.doesNotMatch(ciclo, /\b(select|insert|update|delete)\b[^;]*service_role/);
    assert.doesNotMatch(ciclo, /revoke all on table public\.%i from service_role/);
  });
  test('MAINTAIN compatibile con Postgres 15, 16, 17: compare solo in una stringa costruita se server_version_num >= 170000', () => {
    assert.match(sql, /server_version_num'\)::int >= 170000 then strutturali := strutturali \|\| ', maintain'/);
    const fuori = sql.replace(/strutturali := strutturali \|\| ', maintain'/, '');
    assert.doesNotMatch(fuori, /maintain/, 'MAINTAIN fuori dal ramo condizionato darebbe errore di sintassi su Postgres 15/16');
  });
  test('nessun grant verso anon o authenticated, nessuna policy permissiva', () => {
    assert.doesNotMatch(sql, /grant [^;]* to [^;]*\b(anon|authenticated|public)\b/);
    assert.doesNotMatch(sql, /create policy/);
  });
  test('tocca soltanto le otto tabelle riservate al servizio', () => {
    for (const t of ['agent_registry', 'clienti', 'jarvis_summaries', 'sector_eval_runs', 'sector_faq', 'sector_profiles', 'sector_test_scenarios']) assert.ok(sql.includes(`'${t}'`), t);
    assert.doesNotMatch(sql, /drop |delete from|truncate |update /);
  });
});

describe('test pgTAP sulle sette tabelle', () => {
  const t = leggi('supabase/tests/database/service_role_tables.sql');
  test('il piano dichiarato coincide con i controlli (47) e copre tutte e sette le tabelle', () => {
    assert.match(t, /select plan\(47\);/);
    for (const x of ['agent_registry', 'clienti', 'jarvis_summaries', 'sector_eval_runs', 'sector_faq', 'sector_profiles', 'sector_test_scenarios']) assert.ok(t.includes(`'${x}'`), x);
    assert.match(t, /'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'/);
    assert.match(t, /has_table_privilege\('service_role', 'public\.' \|\| t, 'SELECT'\)/);
    assert.match(t, /sector_faq', 'DELETE'/);
    assert.match(t, /sector_test_scenarios', 'DELETE'/);
  });
});

describe('privilegi predefiniti e proposta pgvector', () => {
  test('privilegi predefiniti: revoca soltanto, mai grant', () => {
    const sql = senzaCommenti(leggi('migrations/20261009040100_default_privileges_hardening.sql'));
    assert.match(sql, /alter default privileges for role postgres in schema public\s+revoke truncate, references, trigger on tables from anon, authenticated, service_role/);
    assert.doesNotMatch(sql, /\bgrant\b/);
  });
  test('lo spostamento di pgvector è una proposta, non una migration applicabile per errore', () => {
    assert.ok(existsSync(new URL('../migrations/proposte/20261009040200_move_vector_extension.sql', import.meta.url)));
    assert.ok(!readdirSync(new URL('../migrations/', import.meta.url)).some((f) => /move_vector/.test(f)));
    const sql = senzaCommenti(leggi('migrations/proposte/20261009040200_move_vector_extension.sql'));
    assert.match(sql, /alter extension vector set schema extensions/);
    assert.match(sql, /set search_path = public, extensions, pg_temp/); // senza extensions nel search_path l'operatore <=> non si risolve
  });
});

describe('copertura dei test di noleggio e giardiniere (set principale)', () => {
  // Il numero di scenari per categoria non dimostra la qualità delle risposte: impedisce soltanto di ridurre la copertura.
  const MINIMI = { NON_HALLUCINATION: 15, AMBIGUOUS: 8, SAFETY: 20, ESCALATION: 10, BOOKING: 15, TENANT_ISOLATION: 5 };
  for (const settore of ['noleggio', 'giardiniere']) {
    test(`${settore}: tutte le aree richieste hanno scenari sufficienti`, async () => {
      const { scenari } = await import(`../lib/engine/packs/${settore}.scenari.js`);
      const conta = {};
      for (const s of scenari) conta[s.categoria] = (conta[s.categoria] || 0) + 1;
      for (const [cat, min] of Object.entries(MINIMI)) assert.ok((conta[cat] || 0) >= min, `${settore} ${cat}: ${conta[cat] || 0} < ${min}`);
    });
  }
});

describe('migration recuperate dal database', () => {
  // MD5 letti dalla cronologia di Supabase il 9/10/2026: il file deve essere identico al testo registrato.
  const ATTESI = {
    '20260929210934_enable_rls_knowledge_base.sql': 'f5c88f5ff9d678aaf9b15f24e19ddf08',
    '20260929215025_008_fix_grants_documents_event_log.sql': 'cfc471921ddefa7fee0ae8831a34a1c0',
    '20261006161416_core_hardening.sql': '2a3718c0bb97868adb7149ddf7b5a9c4',
    '20261006164232_enable_pgtap_testing.sql': 'dd80faa7d9b5d90a935cbd1a1fa12161',
    '20261006164530_tenant_aware_rls_boundary.sql': 'e650282bd31b239daf5c0f9697327634',
    '20261007095900_emergency_escalation_action.sql': '6b9ccab98f4bf1affb95458f337471cb',
  };
  for (const [file, md5] of Object.entries(ATTESI)) {
    test(`${file} coincide con il testo registrato nel database`, () => {
      assert.equal(createHash('md5').update(readFileSync(new URL(`../migrations/recovered/${file}`, import.meta.url))).digest('hex'), md5);
    });
  }
});
