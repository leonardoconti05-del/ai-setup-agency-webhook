-- 011_hardening_search_path.sql
-- Fissa il search_path delle due funzioni segnalate dall'advisor Supabase
-- (function_search_path_mutable). L'estensione `vector` resta in `public`
-- (spostarla richiede una prova su un branch: non fatto qui).
-- Idempotente. Rollback: alter function ... reset search_path;
alter function public.incrementa_utilizzo_mensile(uuid, text) set search_path = public, pg_temp;
alter function public.match_knowledge_chunks(uuid, vector, integer) set search_path = public, pg_temp;
