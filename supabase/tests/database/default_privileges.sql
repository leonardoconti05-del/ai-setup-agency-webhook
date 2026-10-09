-- Le nuove tabelle create da postgres non ereditano privilegi di struttura per i ruoli dell'API.
-- Richiede la migration 20261009040100_default_privileges_hardening.sql. Eseguito da `supabase test db`.
-- I privilegi predefiniti sono l'unione del livello globale (defaclnamespace = 0) e di quello dello schema public: si controllano entrambi
-- e poi, con una tabella di prova creata da postgres (annullata dal rollback), il risultato effettivo.
begin;
select plan(6);

select is(
  (select count(*)::int
     from pg_default_acl d, aclexplode(d.defaclacl) a
    where d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'r'
      and d.defaclrole = 'postgres'::regrole
      and a.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)
      and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')),
  0,
  'privilegi predefiniti dello schema public: nessun TRUNCATE/REFERENCES/TRIGGER/MAINTAIN per i ruoli API'
);

select is(
  (select count(*)::int
     from pg_default_acl d, aclexplode(d.defaclacl) a
    where d.defaclnamespace = 0
      and d.defaclobjtype = 'r'
      and d.defaclrole = 'postgres'::regrole
      and a.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)
      and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')),
  0,
  'privilegi predefiniti globali: nessun TRUNCATE/REFERENCES/TRIGGER/MAINTAIN per i ruoli API'
);

-- PUBLIC (grantee 0) non deve avere nessun privilegio predefinito sulle tabelle, né globale né di schema
select is(
  (select count(*)::int from pg_default_acl d, aclexplode(d.defaclacl) a
    where d.defaclnamespace = 0 and d.defaclobjtype = 'r' and d.defaclrole = 'postgres'::regrole and a.grantee = 0),
  0, 'privilegi predefiniti globali: nessun privilegio a PUBLIC');
select is(
  (select count(*)::int from pg_default_acl d, aclexplode(d.defaclacl) a
    where d.defaclnamespace = 'public'::regnamespace and d.defaclobjtype = 'r' and d.defaclrole = 'postgres'::regrole and a.grantee = 0),
  0, 'privilegi predefiniti dello schema public: nessun privilegio a PUBLIC');

-- effetto combinato: una tabella nuova creata da postgres in public
set local role postgres;
create table public.zz_probe_default_acl (id int);
reset role;
select is(
  (select count(*)::int
     from aclexplode((select relacl from pg_class where oid = 'public.zz_probe_default_acl'::regclass)) a
    where a.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)
      and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')),
  0,
  'tabella nuova creata da postgres: nessun privilegio di struttura per i ruoli API'
);
select is(
  (select count(*)::int from aclexplode((select relacl from pg_class where oid = 'public.zz_probe_default_acl'::regclass)) a where a.grantee = 0),
  0, 'tabella nuova creata da postgres: nessun privilegio a PUBLIC');

select * from finish();
rollback;
