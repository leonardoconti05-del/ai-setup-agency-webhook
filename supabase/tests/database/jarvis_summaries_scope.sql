-- Modello di proprietà di jarvis_summaries. Richiede la migration 20261009050000_jarvis_summaries_scope.sql. Autosufficiente (rollback finale).
begin;
select plan(11);

select has_column('public', 'jarvis_summaries', 'scope', 'colonna scope presente');
select has_column('public', 'jarvis_summaries', 'cliente_id', 'colonna cliente_id presente');
select ok((select relrowsecurity from pg_class where oid = 'public.jarvis_summaries'::regclass), 'RLS attivo');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'jarvis_summaries'), 0, 'nessuna policy: solo backend');

insert into public.clienti (id, nome_attivita, dashboard_token) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Tenant A (test)', 'tok-js-a');

select lives_ok($$insert into public.jarvis_summaries (id, summary) values ('t_agenzia', 'x')$$, 'riga senza scope esplicito = agenzia (compatibile con il codice esistente)');
select is((select scope from public.jarvis_summaries where id = 't_agenzia'), 'agenzia', 'il default è agenzia');
select lives_ok($$insert into public.jarvis_summaries (id, summary, scope, cliente_id) values ('t_tenant', 'x', 'tenant', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$, 'riepilogo di tenant con cliente_id ammesso');
select throws_ok($$insert into public.jarvis_summaries (id, summary, scope) values ('t_orfano', 'x', 'tenant')$$, '23514', null, 'scope tenant senza cliente_id rifiutato');
select throws_ok($$insert into public.jarvis_summaries (id, summary, scope, cliente_id) values ('t_misto', 'x', 'agenzia', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$, '23514', null, 'scope agenzia con cliente_id rifiutato');

set local role anon;
select throws_ok($$select 1 from public.jarvis_summaries$$, '42501', null, 'anon non legge');
reset role;
set local role authenticated;
select throws_ok($$select 1 from public.jarvis_summaries$$, '42501', null, 'authenticated non legge');
reset role;

select * from finish();
rollback;
