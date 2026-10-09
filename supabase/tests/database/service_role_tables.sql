-- Le sette tabelle riservate al backend: service_role non ha privilegi di struttura superflui ma conserva quelli sui dati.
-- Richiede la migration 20261009040000_audit_privileges_hardening.sql. Eseguito da `supabase test db`.
-- Valido su Postgres 15, 16 e 17: i privilegi di struttura si leggono da aclexplode, MAINTAIN compare solo dove esiste.
begin;
select plan(54);

-- 1. service_role: nessun TRUNCATE / REFERENCES / TRIGGER / MAINTAIN (7 controlli)
select is(
  (select count(*)::int from aclexplode((select relacl from pg_class where oid = ('public.' || t)::regclass)) a
    where a.grantee = 'service_role'::regrole and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')),
  0, t || ': service_role senza privilegi di struttura')
from unnest(array['agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_profiles','sector_test_scenarios']) as t;

-- 2. service_role conserva SELECT, INSERT e UPDATE (7 controlli)
select ok(
  has_table_privilege('service_role', 'public.' || t, 'SELECT') and has_table_privilege('service_role', 'public.' || t, 'INSERT') and has_table_privilege('service_role', 'public.' || t, 'UPDATE'),
  t || ': service_role conserva SELECT, INSERT, UPDATE')
from unnest(array['agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_profiles','sector_test_scenarios']) as t;

-- 3. DELETE: richiesto dal backend dove il codice cancella (lib/admin/pack-pipeline.js); jarvis_summaries non lo aveva e non lo riceve (2 controlli)
select ok(has_table_privilege('service_role', 'public.sector_faq', 'DELETE'), 'sector_faq: service_role conserva DELETE');
select ok(has_table_privilege('service_role', 'public.sector_test_scenarios', 'DELETE'), 'sector_test_scenarios: service_role conserva DELETE');

-- 4. anon e authenticated: nessun privilegio (14 controlli)
select is((select count(*)::int from aclexplode((select relacl from pg_class where oid = ('public.' || t)::regclass)) a where a.grantee = 'anon'::regrole), 0, t || ': anon senza privilegi')
from unnest(array['agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_profiles','sector_test_scenarios']) as t;
select is((select count(*)::int from aclexplode((select relacl from pg_class where oid = ('public.' || t)::regclass)) a where a.grantee = 'authenticated'::regrole), 0, t || ': authenticated senza privilegi')
from unnest(array['agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_profiles','sector_test_scenarios']) as t;

-- 4-bis. PUBLIC (grantee 0): nessun privilegio, di nessun tipo (7 controlli)
select is((select count(*)::int from aclexplode((select relacl from pg_class where oid = ('public.' || t)::regclass)) a where a.grantee = 0), 0, t || ': PUBLIC senza privilegi')
from unnest(array['agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_profiles','sector_test_scenarios']) as t;

-- 5. RLS attivo su tutte (7 controlli)
select ok((select relrowsecurity from pg_class where oid = ('public.' || t)::regclass), t || ': RLS attivo')
from unnest(array['agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_profiles','sector_test_scenarios']) as t;

-- 6. comportamento reale: TRUNCATE rifiutato a service_role (7 controlli)
set local role service_role;
select throws_ok(format('truncate public.%I', t), '42501', null, t || ': service_role non può fare TRUNCATE')
from unnest(array['agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_profiles','sector_test_scenarios']) as t;
-- e non può creare trigger né riferimenti (richiedono TRIGGER / REFERENCES) (1 controllo sul comportamento dei dati: la lettura funziona)
select lives_ok($$select count(*) from public.sector_profiles$$, 'service_role legge ancora sector_profiles');
reset role;

-- 7. anon e authenticated: TRUNCATE rifiutato (2 controlli)
set local role anon;
select throws_ok($$truncate public.clienti$$, '42501', null, 'anon non può fare TRUNCATE su clienti');
reset role;
set local role authenticated;
select throws_ok($$truncate public.clienti$$, '42501', null, 'authenticated non può fare TRUNCATE su clienti');
reset role;

select * from finish();
rollback;
