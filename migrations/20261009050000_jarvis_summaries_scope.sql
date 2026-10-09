-- 20261009050000_jarvis_summaries_scope.sql — modello di proprietà esplicito per jarvis_summaries.
--
-- PROBLEMA: la tabella (id text, summary text, generated_at) non dice a chi appartiene un riepilogo. Oggi contiene 1 riga, 'ai_setup_agency_daily'
-- (riepilogo giornaliero DI AGENZIA, aggregato, scritto dall'app Jarvis con la chiave service_role). Senza un modello, un domani un riepilogo
-- per cliente non avrebbe un posto sicuro dove stare.
-- DECISIONE (da confermare dal titolare, vedi docs/JARVIS_CONTRACT.md): ogni riga ha un AMBITO esplicito.
--   scope = 'agenzia' → riepilogo di piattaforma, cliente_id NULL, mai esposto ai clienti;
--   scope = 'tenant'  → riepilogo di una sola attività, cliente_id obbligatorio (elimina in cascata con il cliente).
-- La riga esistente diventa 'agenzia' per default, senza modificarne il contenuto.
-- EFFETTO: due colonne aggiunte (additivo) + un vincolo di coerenza. Nessun dato letto o modificato, nessun privilegio concesso,
-- nessuna policy creata: la tabella resta SOLO backend (RLS attivo, nessuna policy). Il codice di Jarvis che scrive (id, summary, generated_at) continua a funzionare.
-- PRECONDIZIONI: tabella jarvis_summaries e clienti esistenti. IDEMPOTENTE. Su Postgres 15-17.
-- ROLLBACK: alter table public.jarvis_summaries drop constraint if exists jarvis_summaries_scope_coerente, drop column if exists cliente_id, drop column if exists scope;
alter table public.jarvis_summaries
  add column if not exists scope text not null default 'agenzia',
  add column if not exists cliente_id uuid references public.clienti(id) on delete cascade;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jarvis_summaries_scope_coerente' and conrelid = 'public.jarvis_summaries'::regclass) then
    alter table public.jarvis_summaries
      add constraint jarvis_summaries_scope_coerente check (
        (scope = 'agenzia' and cliente_id is null) or (scope = 'tenant' and cliente_id is not null)
      );
  end if;
end $$;

create index if not exists jarvis_summaries_cliente_idx on public.jarvis_summaries (cliente_id) where cliente_id is not null;
comment on column public.jarvis_summaries.scope is 'agenzia = riepilogo di piattaforma (cliente_id NULL); tenant = riepilogo di una sola attività (cliente_id obbligatorio).';
