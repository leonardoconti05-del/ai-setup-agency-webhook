-- Le nuove tabelle in public non ereditano privilegi di struttura per i ruoli dell'API.
-- Richiede la migration 20261009040100_default_privileges_hardening.sql.
begin;
select plan(1);
select is(
  (select count(*)::int
     from pg_default_acl d, aclexplode(d.defaclacl) a
    where d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'r'
      and d.defaclrole = 'postgres'::regrole
      and a.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)
      and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')),
  0,
  'privilegi predefiniti: nessun TRUNCATE/REFERENCES/TRIGGER/MAINTAIN per i ruoli API'
);
select * from finish();
rollback;
