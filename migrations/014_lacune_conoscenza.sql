-- 014_lacune_conoscenza.sql — registro permanente delle domande a cui il bot non ha saputo rispondere.
-- ADDITIVA e IDEMPOTENTE. Il codice funziona anche se la tabella non esiste (best-effort).
-- Per tenant, una riga per domanda (normalizzata) con contatore. Il testo è troncato a 200 caratteri.
-- Rollback: drop table if exists lacune_conoscenza;
create table if not exists lacune_conoscenza (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references clienti(id) on delete cascade,
  chiave text not null,
  domanda text not null,
  tipo text not null default 'informazione' check (tipo in ('informazione','non_compreso')),
  intent text,
  volte int not null default 1,
  stato text not null default 'aperta' check (stato in ('aperta','risolta')),
  primo_il timestamptz not null default now(),
  ultimo_il timestamptz not null default now(),
  unique (cliente_id, chiave)
);
create index if not exists lacune_conoscenza_cliente_idx on lacune_conoscenza (cliente_id, stato, volte desc);
alter table lacune_conoscenza enable row level security;
grant select, insert, update, delete on table lacune_conoscenza to service_role;
grant usage, select on all sequences in schema public to service_role;
