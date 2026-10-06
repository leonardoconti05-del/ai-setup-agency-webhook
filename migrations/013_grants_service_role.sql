-- 013_grants_service_role.sql
-- Le tabelle create dalle migrazioni 010 e 012 non avevano i GRANT per service_role:
-- il webhook riceveva 403 (permission denied) leggendo sector_profiles e il motore
-- restava spento (stesso problema già risolto per altre tabelle in 008).
-- RLS resta attiva senza policy: anon/authenticated non hanno accesso. Idempotente.
grant usage on schema public to service_role;
grant select, insert, update, delete on table
  sector_profiles, sector_faq, sector_test_scenarios, sector_eval_runs,
  ai_action_ledger, agent_registry, tenant_action_policy, approval_requests
  to service_role;
grant usage, select on all sequences in schema public to service_role;
-- Rollback: revoke all on table <le stesse tabelle> from service_role;
