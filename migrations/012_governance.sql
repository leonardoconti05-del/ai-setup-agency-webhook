-- 012_governance.sql — Fasi 1-2 della specifica "Governed AI" (docs/ARCHITETTURA_SOVEREIGN_AI_v1.md)
-- Registro azioni AI (append-only con hash a catena), registro agenti, policy di
-- autonomia per tenant, richieste di approvazione. ADDITIVA e IDEMPOTENTE.
-- Il codice funziona anche se queste tabelle non esistono (best-effort + default).
-- Rollback: drop table if exists approval_requests, tenant_action_policy, agent_registry, ai_action_ledger;
--           drop function if exists ai_ledger_block_mutation();

create table if not exists ai_action_ledger (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references clienti(id) on delete cascade,
  request_id uuid,
  created_at timestamptz not null default now(),
  actor text not null,
  action text not null,
  autonomy_level smallint not null check (autonomy_level between 0 and 5),
  approval text not null default 'not_required' check (approval in ('not_required','pending','approved','rejected')),
  reason text,
  subject_ref text,
  sources jsonb not null default '[]'::jsonb,
  model text, prompt_version text, policy_version text, pack_version int,
  input_hash text,
  output_excerpt text,
  result text not null default 'ok',
  prev_hash text not null default 'GENESIS',
  row_hash text not null
);
create index if not exists ai_action_ledger_cliente_idx on ai_action_ledger (cliente_id, id desc);
-- Una sola riga per "figlio" di un dato hash: due scritture concorrenti non possono biforcare la catena.
create unique index if not exists ai_action_ledger_chain_idx on ai_action_ledger (cliente_id, prev_hash);

create or replace function ai_ledger_block_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'ai_action_ledger è append-only (% vietato)', tg_op;
end $$;
drop trigger if exists ai_ledger_no_update on ai_action_ledger;
create trigger ai_ledger_no_update before update on ai_action_ledger
  for each row execute function ai_ledger_block_mutation();
-- DELETE per riga vietato; la cancellazione a cascata del tenant (clienti) resta possibile.
drop trigger if exists ai_ledger_no_delete on ai_action_ledger;
create trigger ai_ledger_no_delete before delete on ai_action_ledger
  for each row when (pg_trigger_depth() = 0) execute function ai_ledger_block_mutation();

create table if not exists agent_registry (
  agent_id text primary key,
  descrizione text not null,
  attivo boolean not null default true
);
insert into agent_registry (agent_id, descrizione) values
  ('whatsapp', 'Assistente conversazionale su WhatsApp (api/whatsapp.js)'),
  ('followup', 'Follow-up automatico (api/cron/follow-up.js)'),
  ('dashboard', 'Azioni del titolare dalla dashboard')
on conflict (agent_id) do nothing;

create table if not exists tenant_action_policy (
  cliente_id uuid not null references clienti(id) on delete cascade,
  agent_id text not null references agent_registry(agent_id),
  action text not null,
  autonomy_level smallint not null check (autonomy_level between 0 and 5),
  condizioni jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (cliente_id, agent_id, action)
);

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  agent_id text not null,
  action text not null,
  payload jsonb not null,
  stato text not null default 'pending' check (stato in ('pending','approved','rejected','expired')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
create index if not exists approval_requests_cliente_idx on approval_requests (cliente_id, stato, created_at desc);

alter table ai_action_ledger enable row level security;
alter table agent_registry enable row level security;
alter table tenant_action_policy enable row level security;
alter table approval_requests enable row level security;
