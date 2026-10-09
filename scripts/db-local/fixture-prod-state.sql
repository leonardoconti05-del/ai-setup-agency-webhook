-- Riproduce lo stato VERIFICATO sul database di produzione il 9/10/2026 (privilegi predefiniti + tabelle interessate).
-- Solo per prove locali: non va mai eseguito su Supabase.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'postgres') then create role postgres superuser login; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
grant anon, authenticated, service_role to pgtest;  -- permette ai test di fare SET ROLE
alter default privileges for role postgres in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to service_role;
set role postgres;
create table agent_registry (id int); create table clienti (id uuid primary key default gen_random_uuid());
create table jarvis_summaries (id int); create table sector_eval_runs (id int); create table sector_faq (id int);
create table sector_profiles (id int); create table sector_test_scenarios (id int);
alter table agent_registry enable row level security; alter table clienti enable row level security; alter table jarvis_summaries enable row level security;
alter table sector_eval_runs enable row level security; alter table sector_faq enable row level security; alter table sector_profiles enable row level security;
alter table sector_test_scenarios enable row level security;
-- privilegi sui dati come in produzione (relacl del 9/10/2026): service_role arwd, jarvis_summaries senza DELETE
grant select, insert, update, delete on agent_registry, clienti, sector_eval_runs, sector_faq, sector_profiles, sector_test_scenarios to service_role;
grant select, insert, update on jarvis_summaries to service_role;
reset role;
