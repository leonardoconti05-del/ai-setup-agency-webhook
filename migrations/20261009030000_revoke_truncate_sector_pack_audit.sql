-- 20261009030000_revoke_truncate_sector_pack_audit.sql — toglie il permesso TRUNCATE dalla tabella di audit dei Sector Pack.
-- Perché: sector_pack_audit è append-only (trigger che blocca UPDATE/DELETE, migrazione 016), ma TRUNCATE non passa
-- dai trigger di riga: chi lo possiede può svuotare l'audit in un colpo solo. Per Supabase anon, authenticated e
-- service_role lo avevano di default. L'applicazione non ha mai bisogno di svuotare questa tabella.
-- ADDITIVA e IDEMPOTENTE (REVOKE su un permesso già assente non fa nulla). Non tocca dati né le altre tabelle.
-- Il proprietario (postgres) resta intatto: è l'unico che può ancora fare manutenzione, e non è raggiungibile dall'API.
-- Rollback: grant truncate on table sector_pack_audit to anon, authenticated, service_role;
revoke truncate on table public.sector_pack_audit from anon;
revoke truncate on table public.sector_pack_audit from authenticated;
revoke truncate on table public.sector_pack_audit from service_role;
