-- 010_sector_engine.sql
--
-- Fondamenta del "motore verticale": la conoscenza di settore (vocabolario,
-- intent, entità, regole di sicurezza, FAQ, scenari di test) vive nel
-- database, versionata, e il codice (lib/engine/*) la legge a runtime.
-- Aggiungere un nuovo settore = inserire dati, non riscrivere il motore.
--
-- MIGRATION ADDITIVA: non modifica né elimina nulla di esistente. Se per un
-- settore non esiste un profilo in stato 'production', api/whatsapp.js segue
-- esattamente il percorso precedente (nessuna regressione per i settori non
-- ancora migrati).
--
-- Idempotente (create ... if not exists / create or replace / drop trigger if
-- exists). Rollback ragionevole: vedi in fondo.
--
-- Separazione concettuale (settore != cliente):
--   sector_*              -> conoscenza di SETTORE, condivisa da tutti i tenant
--   configurazioni_cliente, servizi_cliente, documents -> conoscenza del singolo
--                            TENANT (prezzi, orari, servizi), che ha sempre
--                            priorità e non viene mai inventata dal settore.

-- ===== 1. Profili di settore versionati =====
-- Il contenuto strutturato sta in `pack` (jsonb) — schema validato dal codice
-- (lib/engine/pack.js: validaPack) e documentato in docs/SECTOR_ENGINE.md.
-- Una sola colonna jsonb invece di 15 colonne: evolve senza migration ogni
-- volta che si aggiunge una sezione, ed è comunque interamente versionata.
create table if not exists sector_profiles (
  id uuid primary key default gen_random_uuid(),
  settore text not null,
  version int not null check (version > 0),
  status text not null default 'draft'
    check (status in ('draft', 'test', 'approved', 'production', 'archived')),
  pack jsonb not null,
  changelog text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (settore, version)
);

-- Al massimo UNA versione in produzione per settore.
create unique index if not exists sector_profiles_one_production_idx
  on sector_profiles (settore) where status = 'production';

create index if not exists sector_profiles_settore_idx on sector_profiles (settore, status);

-- ===== 2. FAQ di settore =====
-- Domande ricorrenti generali del settore (cosa significa un trattamento,
-- come funziona una prima visita...). Mai prezzi/orari/servizi di un'attività
-- specifica: quelli stanno solo nei dati del tenant.
create table if not exists sector_faq (
  id uuid primary key default gen_random_uuid(),
  settore text not null,
  version int not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'test', 'approved', 'production', 'archived')),
  intent text,
  domanda_canonica text not null,
  varianti jsonb not null default '[]'::jsonb,
  risposta_base text not null,
  condizioni jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sector_faq_settore_idx on sector_faq (settore, status);

-- ===== 3. Scenari di test per settore =====
-- Ogni scenario dichiara input e comportamento atteso; lib/engine/evaluate.js
-- li esegue sul motore e calcola le metriche (intent/entity/action accuracy,
-- safety, escalation, hallucination, tenant isolation).
create table if not exists sector_test_scenarios (
  id uuid primary key default gen_random_uuid(),
  settore text not null,
  codice text not null,
  categoria text not null
    check (categoria in ('NORMAL','AMBIGUOUS','ADVERSARIAL','NON_HALLUCINATION','SAFETY','TENANT_ISOLATION','BOOKING','LEAD','ESCALATION')),
  scenario jsonb not null,
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (settore, codice)
);

create index if not exists sector_test_scenarios_settore_idx on sector_test_scenarios (settore, categoria);

-- ===== 4. Esiti delle valutazioni =====
-- Una riga per ogni esecuzione della suite su una versione di profilo: serve
-- per confrontare v1 vs v2 e per BLOCCARE la promozione a produzione se la
-- valutazione non supera la soglia (vedi trigger sotto).
create table if not exists sector_eval_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references sector_profiles(id) on delete cascade,
  settore text not null,
  version int not null,
  scenari_totali int not null,
  scenari_passati int not null,
  metriche jsonb not null,
  gate_passed boolean not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists sector_eval_runs_profile_idx on sector_eval_runs (profile_id, created_at desc);

-- ===== 5. Gate di promozione =====
-- Un profilo può diventare 'production' solo se esiste una valutazione che ha
-- superato il gate per QUELLA versione. Se una modifica rompe gli scenari,
-- gate_passed è false e la promozione viene rifiutata dal database stesso
-- (non solo dal codice applicativo).
create or replace function sector_profiles_gate_production()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'production' and (tg_op = 'INSERT' or old.status is distinct from 'production') then
    if not exists (
      select 1 from sector_eval_runs
      where profile_id = new.id and gate_passed = true
    ) then
      raise exception 'Promozione bloccata: il profilo % v% non ha una valutazione superata (sector_eval_runs.gate_passed)', new.settore, new.version;
    end if;
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists sector_profiles_gate_production_trg on sector_profiles;
create trigger sector_profiles_gate_production_trg
  before insert or update on sector_profiles
  for each row execute function sector_profiles_gate_production();

-- ===== 6. Sicurezza: stessa postura delle altre tabelle =====
-- RLS attiva senza policy: accesso solo con la service role key usata dal
-- webhook e dalle dashboard server-side. Nessun accesso diretto da client.
alter table sector_profiles enable row level security;
alter table sector_faq enable row level security;
alter table sector_test_scenarios enable row level security;
alter table sector_eval_runs enable row level security;

-- ROLLBACK (se necessario, nessun dato tenant coinvolto):
--   drop trigger if exists sector_profiles_gate_production_trg on sector_profiles;
--   drop function if exists sector_profiles_gate_production();
--   drop table if exists sector_eval_runs, sector_test_scenarios, sector_faq, sector_profiles;
