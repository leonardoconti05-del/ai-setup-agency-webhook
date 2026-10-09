-- 20261009040100_default_privileges_hardening.sql — le NUOVE tabelle non ereditano più TRUNCATE/REFERENCES/TRIGGER/MAINTAIN.
--
-- PROBLEMA: pg_default_acl (ruolo postgres, schema public) assegna ad anon, authenticated e service_role i privilegi
-- TRUNCATE, REFERENCES, TRIGGER (e MAINTAIN su Postgres 17) su ogni tabella creata da postgres. È la causa del privilegio
-- TRUNCATE trovato su sector_pack_audit e su altre tabelle.
-- COME SI COMBINANO [V: pg_default_acl di produzione, 9/10/2026]: i privilegi predefiniti di un ruolo valgono per le tabelle che quel ruolo
-- crea e sono l'UNIONE di due livelli: quello globale (defaclnamespace = 0) e quello dello schema (IN SCHEMA public). Una REVOCA
-- limitata allo schema toglie soltanto le voci dello schema: non può togliere una concessione GLOBALE. In produzione per il ruolo postgres
-- c'è solo la voce dello schema public (anon, authenticated, service_role = Dxtm); nessuna voce globale per le tabelle. Per non dipendere
-- da questo fatto la migration revoca ad ENTRAMBI i livelli. La revoca globale non può togliere nulla di necessario: nel database non c'è
-- nessuna concessione globale da conservare, e i privilegi sui dati (SELECT/INSERT/UPDATE/DELETE) non vengono toccati.
-- NON TOCCATO: le voci del ruolo supabase_admin (schema public: arwdDxtm per anon, authenticated, service_role). Valgono solo per tabelle create
-- da supabase_admin; le 23 tabelle di public sono tutte di proprietà di postgres [V]. Cambiarle richiede il ruolo supabase_admin: vedi AUDIT_FASE1.
-- EFFETTO: solo sulle tabelle create DOPO questa migration. Le tabelle esistenti non cambiano (le tratta la migration
-- 20261009040000 e le eventuali revoche esplicite). I privilegi di dati (SELECT/INSERT/UPDATE/DELETE) restano da
-- concedere tabella per tabella come già avviene (vedi 013_grants_service_role.sql).
-- PRECONDIZIONI: ruolo postgres. IDEMPOTENTE. Su Postgres < 17 la parte MAINTAIN è saltata.
-- ROLLBACK:
--   -- livello dello schema public
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated, service_role;
-- livello globale
alter default privileges for role postgres
  revoke truncate, references, trigger on tables from anon, authenticated, service_role;

do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated, service_role';
    execute 'alter default privileges for role postgres revoke maintain on tables from anon, authenticated, service_role';
  end if;
end $$;
