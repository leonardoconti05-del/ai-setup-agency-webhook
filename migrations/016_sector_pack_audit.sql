-- 016_sector_pack_audit.sql — registro di audit dell'importazione/promozione dei Sector Pack.
-- Riusa sector_profiles / sector_faq / sector_test_scenarios / sector_eval_runs (010) per i dati e gli stati
-- (mappa: DRAFT=draft, TEST=test, ACTIVE=production, SUSPENDED=archived). Questa tabella aggiunge SOLO la
-- tracciabilità (chi/quando/da quale commit/con quale esito): append-only, nessun segreto, nessun testo di clienti.
-- ADDITIVA e IDEMPOTENTE. Rollback: drop table if exists sector_pack_audit; drop function if exists sector_pack_audit_block_mutation();
create table if not exists sector_pack_audit (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  evento text not null check (evento in ('import','verifica','promozione','sospensione','auth_failed')),
  settore text,
  pack_version int,
  stato_prima text,
  stato_dopo text,
  esito text not null check (esito in ('ok','invariato','saltato','rifiutato','errore')),
  n_intent int, n_faq int, n_scenari int, n_holdout int,
  gate_passed boolean,
  holdout_primo_giro jsonb,
  commit_sha text,
  pack_hash text,
  errore text,
  ip_hash text,
  dettaglio jsonb
);
create index if not exists sector_pack_audit_settore_idx on sector_pack_audit (settore, id desc);
create index if not exists sector_pack_audit_auth_idx on sector_pack_audit (evento, created_at desc);

create or replace function sector_pack_audit_block_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'sector_pack_audit è append-only (% vietato)', tg_op;
end $$;
drop trigger if exists sector_pack_audit_no_update on sector_pack_audit;
create trigger sector_pack_audit_no_update before update on sector_pack_audit for each row execute function sector_pack_audit_block_mutation();
drop trigger if exists sector_pack_audit_no_delete on sector_pack_audit;
create trigger sector_pack_audit_no_delete before delete on sector_pack_audit for each row execute function sector_pack_audit_block_mutation();

alter table sector_pack_audit enable row level security;
grant select, insert on table sector_pack_audit to service_role;
grant usage, select on all sequences in schema public to service_role;
