-- 20260901000000_baseline_schema_ricostruito.sql — SCHEMA DI BASE RICOSTRUITO (non è il testo originale).
--
-- COSA È: le sette tabelle di base che nel repository e nella cronologia delle migration NON hanno alcun file di creazione
-- (le migration 001-003 citate in docs/DECISIONS.md non esistono nel repo). La struttura è stata letta in SOLA LETTURA dal catalogo
-- del database di produzione il 9/10/2026 (colonne, tipi, default, vincoli, indici). Nessun dato è stato letto o copiato.
-- COSA NON È: non è il testo esatto delle migration originali (perse). Per questo sta in migrations/recovered/ ed è SOLO per ricostruire
-- un ambiente di TEST. NON ESEGUIRLO sul database di produzione (le tabelle esistono già).
-- INCLUSI ANCHE: la funzione public.incrementa_utilizzo_mensile (usata dalla 011 e dal backend; definizione letta con pg_get_functiondef) e la policy
-- "Permetti insert da service role" su richieste_pazienti (presente in produzione).
-- COLONNE ESCLUSE perché aggiunte da migration presenti nel repo (che così vengono davvero esercitate):
--   configurazioni_cliente: follow_up_* (006), valore_medio_cliente (007); clienti: password_hash (009).
-- TRIGGER ESCLUSO: clienti_seed_action_policy (dipende da private.seed_default_tenant_action_policies, creata da migration successive).
-- RLS: attivo su tutte (come in produzione); le policy le crea tenant_aware_rls_boundary.
create table if not exists public.clienti (
  id uuid not null default gen_random_uuid(),
  nome_attivita text not null,
  email_contatto text,
  created_at timestamp with time zone default now(),
  dashboard_token text not null,
  constraint clienti_pkey primary key (id)
);
create unique index if not exists clienti_email_contatto_unique_idx on public.clienti using btree (lower(email_contatto)) where (email_contatto is not null);
create unique index if not exists idx_clienti_dashboard_token on public.clienti using btree (dashboard_token);

create table if not exists public.configurazioni_cliente (
  id uuid not null default gen_random_uuid(),
  cliente_id uuid not null,
  numero_whatsapp text not null,
  nome_attivita text not null,
  settore text not null,
  tono text default 'professionale'::text,
  campi_da_raccogliere jsonb not null,
  criteri_urgenza text,
  messaggio_urgenza text,
  orari_apertura jsonb,
  contatto_escalation text,
  attivo boolean default true,
  created_at timestamp with time zone default now(),
  telegram_chat_id text,
  google_calendar_id text,
  info_generali jsonb default '{}'::jsonb,
  dashboard_token text,
  limite_messaggi_mese integer,
  constraint configurazioni_cliente_pkey primary key (id),
  constraint configurazioni_cliente_dashboard_token_key unique (dashboard_token),
  constraint configurazioni_cliente_numero_whatsapp_key unique (numero_whatsapp),
  constraint configurazioni_cliente_cliente_id_fkey foreign key (cliente_id) references public.clienti(id) on delete cascade
);
create index if not exists configurazioni_cliente_cliente_id_idx on public.configurazioni_cliente using btree (cliente_id);

create table if not exists public.jarvis_summaries (
  id text not null,
  summary text not null,
  generated_at timestamp with time zone not null default now(),
  constraint jarvis_summaries_pkey primary key (id)
);

create table if not exists public.richieste_clienti (
  id uuid not null default gen_random_uuid(),
  cliente_id uuid not null,
  numero_utente text not null,
  dati_raccolti jsonb default '{}'::jsonb,
  stato text default 'in_corso'::text,
  conversazione jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint richieste_clienti_pkey primary key (id),
  constraint richieste_clienti_cliente_numero_unique unique (cliente_id, numero_utente),
  constraint richieste_clienti_cliente_id_fkey foreign key (cliente_id) references public.clienti(id) on delete cascade
);

create table if not exists public.richieste_pazienti (
  id uuid not null default gen_random_uuid(),
  cliente_id text not null default 'studio-dentistico-sorriso'::text,
  nome text, motivo text, urgenza text, disponibilita text, tipo_paziente text, telefono text,
  created_at timestamp with time zone not null default now(),
  constraint richieste_pazienti_pkey primary key (id)
);

create table if not exists public.utilizzo_mensile (
  cliente_id uuid not null,
  mese text not null,
  conteggio integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  constraint utilizzo_mensile_pkey primary key (cliente_id, mese),
  constraint utilizzo_mensile_cliente_id_fkey foreign key (cliente_id) references public.clienti(id) on delete cascade
);

create table if not exists public.whatsapp_conversations (
  telefono text not null,
  cliente_id text,
  storico jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone not null default now(),
  constraint whatsapp_conversations_pkey primary key (telefono)
);

alter table public.clienti enable row level security;
alter table public.configurazioni_cliente enable row level security;
alter table public.jarvis_summaries enable row level security;
alter table public.richieste_clienti enable row level security;
alter table public.richieste_pazienti enable row level security;
alter table public.utilizzo_mensile enable row level security;
alter table public.whatsapp_conversations enable row level security;

create policy "Permetti insert da service role" on public.richieste_pazienti for insert to service_role with check (true);

create or replace function public.incrementa_utilizzo_mensile(p_cliente_id uuid, p_mese text)
 returns table(conteggio integer)
 language sql
 set search_path to 'public', 'pg_temp'
as $function$
  insert into utilizzo_mensile (cliente_id, mese, conteggio, updated_at)
  values (p_cliente_id, p_mese, 1, now())
  on conflict (cliente_id, mese)
  do update set conteggio = utilizzo_mensile.conteggio + 1, updated_at = now()
  returning utilizzo_mensile.conteggio;
$function$;
grant execute on function public.incrementa_utilizzo_mensile(uuid, text) to service_role;
