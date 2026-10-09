-- Allinea un database di TEST nuovo al profilo di privilegi della produzione (verificato in sola lettura il 9/10/2026). NON per la produzione.
-- La policy "Permetti insert da service role" su richieste_pazienti è già nella baseline ricostruita (file del repo).

alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;

do $$
declare t text;
begin
  for t in select c.relname from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r'
  loop execute format('revoke select, insert, update, delete on table public.%I from anon', t); end loop;
  for t in select unnest(array['agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_pack_audit','sector_profiles','sector_test_scenarios'])
  loop execute format('revoke select, insert, update, delete on table public.%I from authenticated', t); end loop;
end $$;

-- privilegi di service_role che in produzione sono più stretti del default
revoke insert, update, delete on table public.action_registry from service_role;
revoke delete on table public.jarvis_summaries from service_role;
revoke delete on table public.richieste_pazienti from service_role;
revoke update, delete on table public.sector_pack_audit from service_role;
revoke delete on table public.utilizzo_mensile from service_role;
