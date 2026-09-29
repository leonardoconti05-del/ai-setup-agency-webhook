-- migrations/008_servizi_personale.sql
--
-- Due tabelle semplici per far diventare la dashboard cliente un vero
-- gestionale, senza introdurre un sistema completo (turni, fatturazione,
-- calendario) che al momento sarebbe prematuro con pochi clienti attivi:
--
-- - servizi_cliente: elenco dei servizi offerti, con prezzo facoltativo.
--   Sostituisce concettualmente il campo libero "servizi_offerti" dentro
--   info_generali (che resta per compatibilità, ma la dashboard userà
--   questi dati strutturati per mostrare un vero listino).
-- - personale_cliente: un semplice elenco di persone/ruoli, NON un sistema
--   di turni/permessi — utile a un titolare per avere una lista ordinata
--   del proprio staff, mostrata nella dashboard.
--
-- NOTA IMPORTANTE (vedi P2-2 sotto, imparata da un bug reale il 29/9/2026):
-- le tabelle create nella sessione precedente (documents, knowledge_chunks,
-- event_log) erano finite senza i GRANT di base per service_role, causando
-- 403 "permission denied" su ogni richiesta REST nonostante RLS fosse
-- configurata correttamente. Questa migrazione include i GRANT espliciti
-- fin dall'inizio, per non ripetere lo stesso errore.

create table if not exists servizi_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  nome text not null,
  prezzo numeric,
  durata_minuti integer,
  attivo boolean not null default true,
  creato_il timestamptz not null default now()
);
comment on table servizi_cliente is 'Elenco strutturato dei servizi offerti da un cliente (nome, prezzo facoltativo), mostrato nella dashboard come un vero listino.';

create table if not exists personale_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  nome text not null,
  ruolo text,
  telefono text,
  attivo boolean not null default true,
  creato_il timestamptz not null default now()
);
comment on table personale_cliente is 'Elenco semplice dello staff di un cliente (nome, ruolo). Non è un sistema di turni/permessi.';

create index if not exists idx_servizi_cliente_cliente_id on servizi_cliente(cliente_id);
create index if not exists idx_personale_cliente_cliente_id on personale_cliente(cliente_id);

alter table servizi_cliente enable row level security;
alter table personale_cliente enable row level security;

-- P2-2: GRANT esplicito per service_role, allineato alle altre tabelle
-- applicative (clienti, richieste_clienti, configurazioni_cliente) — senza
-- questo, RLS da solo non basta: il backend (che usa sempre service_role)
-- riceverebbe comunque 403 "permission denied" a livello di permessi
-- Postgres, prima ancora che le policy RLS vengano valutate.
grant select, insert, update, delete on servizi_cliente to service_role;
grant select, insert, update, delete on personale_cliente to service_role;
