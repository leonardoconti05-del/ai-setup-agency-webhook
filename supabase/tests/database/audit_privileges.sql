-- Privilegi di sector_pack_audit: lo storico non deve poter essere cancellato né alterato dai ruoli dell'API.
-- Richiede la migration 20261009040000_audit_privileges_hardening.sql. Eseguito da `supabase test db`.
begin;
select plan(17);

-- 1. struttura
select ok((select relrowsecurity from pg_class where oid = 'public.sector_pack_audit'::regclass), 'RLS attivo');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'sector_pack_audit'), 0, 'nessuna policy: anon e authenticated non hanno accesso');
select is((select count(*)::int from pg_trigger where tgrelid = 'public.sector_pack_audit'::regclass and not tgisinternal and tgenabled = 'O'), 2, 'trigger no_update e no_delete attivi');

-- 2. privilegi diretti (qualsiasi privilegio, anche di struttura, per qualsiasi versione di Postgres)
select is((select count(*)::int from aclexplode((select relacl from pg_class where oid = 'public.sector_pack_audit'::regclass)) a where a.grantee = 0), 0, 'nessun privilegio a PUBLIC');
select is((select count(*)::int from aclexplode((select relacl from pg_class where oid = 'public.sector_pack_audit'::regclass)) a where a.grantee = 'anon'::regrole), 0, 'anon: nessun privilegio');
select is((select count(*)::int from aclexplode((select relacl from pg_class where oid = 'public.sector_pack_audit'::regclass)) a where a.grantee = 'authenticated'::regrole), 0, 'authenticated: nessun privilegio');
select is((select array_agg(a.privilege_type order by a.privilege_type) from aclexplode((select relacl from pg_class where oid = 'public.sector_pack_audit'::regclass)) a where a.grantee = 'service_role'::regrole), array['INSERT','SELECT'], 'service_role: solo INSERT e SELECT');

-- 3. privilegi ereditati: i ruoli dell'API non sono membri di altri ruoli
select is((select count(*)::int from pg_auth_members m join pg_roles r on r.oid = m.member where r.rolname in ('anon','authenticated','service_role')), 0, 'nessun privilegio ereditato tramite ruoli');

-- 4. comportamento reale con ciascun ruolo
set local role service_role;
select lives_ok($$insert into public.sector_pack_audit (evento, esito) values ('verifica', 'ok')$$, 'service_role può aggiungere righe');
select throws_ok($$update public.sector_pack_audit set esito = 'errore'$$, '42501', null, 'service_role non può modificare');
select throws_ok($$delete from public.sector_pack_audit$$, '42501', null, 'service_role non può cancellare');
select throws_ok($$truncate public.sector_pack_audit$$, '42501', null, 'service_role non può fare TRUNCATE');
reset role;

set local role authenticated;
select throws_ok($$select 1 from public.sector_pack_audit$$, '42501', null, 'authenticated non può leggere');
select throws_ok($$truncate public.sector_pack_audit$$, '42501', null, 'authenticated non può fare TRUNCATE');
reset role;

set local role anon;
select throws_ok($$insert into public.sector_pack_audit (evento, esito) values ('verifica', 'ok')$$, '42501', null, 'anon non può scrivere');
select throws_ok($$truncate public.sector_pack_audit$$, '42501', null, 'anon non può fare TRUNCATE');
reset role;

-- 5. rete di sicurezza: anche il proprietario non può alterare le righe (trigger)
select throws_ok($$update public.sector_pack_audit set esito = 'errore'$$, 'P0001', null, 'il proprietario non può modificare (trigger)');

select * from finish();
rollback;
