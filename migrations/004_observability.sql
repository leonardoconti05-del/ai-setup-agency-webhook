-- 004_observability.sql
--
-- Tabella di log per il tracciamento end-to-end di ogni messaggio WhatsApp
-- in ingresso. Ogni richiesta al webhook riceve un request_id univoco
-- (generato in api/whatsapp.js con crypto.randomUUID()); ogni fase
-- significativa dell'elaborazione scrive una riga qui, con lo stesso
-- request_id. Questo permette di ricostruire l'intero percorso di un
-- singolo messaggio (ricevuto → verificato → tenant identificato →
-- conversazione recuperata → Claude → azione → esito) senza dover
-- incrociare a mano i log di Vercel.
--
-- Scrittura "best-effort": vedi lib/logger.js — un errore di scrittura qui
-- non deve mai far fallire l'elaborazione del messaggio reale.

create table if not exists event_log (
  id bigint generated always as identity primary key,
  request_id uuid not null,
  cliente_id uuid,
  telefono text,
  fase text not null,
  stato text not null default 'ok', -- 'ok' oppure 'errore'
  dettaglio jsonb,
  created_at timestamptz not null default now()
);

-- Per seguire un singolo messaggio dall'inizio alla fine:
create index if not exists event_log_request_id_idx on event_log (request_id);

-- Per filtrare gli eventi di un cliente specifico (dashboard, debug):
create index if not exists event_log_cliente_id_idx on event_log (cliente_id);

-- Per trovare rapidamente gli errori recenti, indipendentemente dal cliente:
create index if not exists event_log_stato_created_idx on event_log (stato, created_at desc);

comment on table event_log is
  'Log di osservabilità per il webhook WhatsApp: una riga per fase di elaborazione, raggruppabile per request_id.';
