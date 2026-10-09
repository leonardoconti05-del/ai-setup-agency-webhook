-- Minimo sostituto locale di pgTAP (solo per scripts/db-local/run-audit-check.sh): plan, ok, is, lives_ok, throws_ok, finish.
-- NON è pgTAP: serve a eseguire gli stessi file supabase/tests/database/*.sql su un Postgres senza l'estensione.
create schema if not exists tap;
create table if not exists tap.res (n serial, ok boolean, descr text, detail text);
create or replace function plan(int) returns text language sql as $$ select '1..' || $1 $$;
create or replace function ok(boolean, text default '') returns text language plpgsql as $$
begin insert into tap.res(ok, descr) values (coalesce($1, false), $2); return case when coalesce($1,false) then 'ok - ' else 'not ok - ' end || $2; end $$;
create or replace function is(anyelement, anyelement, text default '') returns text language plpgsql as $$
declare r boolean := $1 is not distinct from $2;
begin insert into tap.res(ok, descr, detail) values (r, $3, case when r then null else format('ottenuto %L atteso %L', $1, $2) end);
  return case when r then 'ok - ' else 'not ok - ' end || $3; end $$;
create or replace function lives_ok(text, text default '') returns text language plpgsql as $$
begin execute $1; insert into tap.res(ok, descr) values (true, $2); return 'ok - ' || $2;
exception when others then insert into tap.res(ok, descr, detail) values (false, $2, sqlstate || ' ' || sqlerrm); return 'not ok - ' || $2; end $$;
create or replace function throws_ok(text, text, text, text default '') returns text language plpgsql as $$
begin execute $1; insert into tap.res(ok, descr, detail) values (false, $4, 'nessun errore'); return 'not ok - ' || $4;
exception when others then
  insert into tap.res(ok, descr, detail) values (sqlstate = $2, $4, case when sqlstate = $2 then null else 'ottenuto ' || sqlstate || ' atteso ' || $2 end);
  return case when sqlstate = $2 then 'ok - ' else 'not ok - ' end || $4; end $$;
create or replace function finish() returns setof text language sql as $$ select 'fatto' $$;
grant usage on schema tap to public; grant all on tap.res to public; grant usage on all sequences in schema tap to public;
