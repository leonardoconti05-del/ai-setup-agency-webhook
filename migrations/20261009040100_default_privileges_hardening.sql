-- 20261009040100_default_privileges_hardening.sql — le NUOVE tabelle non ereditano più TRUNCATE/REFERENCES/TRIGGER/MAINTAIN.
--
-- PROBLEMA: pg_default_acl (ruolo postgres, schema public) assegna ad anon, authenticated e service_role i privilegi
-- TRUNCATE, REFERENCES, TRIGGER (e MAINTAIN su Postgres 17) su ogni tabella creata da postgres. È la causa del privilegio
-- TRUNCATE trovato su sector_pack_audit e su altre tabelle.
-- EFFETTO: solo sulle tabelle create DOPO questa migration. Le tabelle esistenti non cambiano (le tratta la migration
-- 20261009040000 e le eventuali revoche esplicite). I privilegi di dati (SELECT/INSERT/UPDATE/DELETE) restano da
-- concedere tabella per tabella come già avviene (vedi 013_grants_service_role.sql).
-- PRECONDIZIONI: ruolo postgres. IDEMPOTENTE. Su Postgres < 17 la parte MAINTAIN è saltata.
-- ROLLBACK:
--   alter default privileges for role postgres in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated, service_role;

do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated, service_role';
  end if;
end $$;
