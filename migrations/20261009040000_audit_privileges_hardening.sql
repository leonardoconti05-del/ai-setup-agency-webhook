-- 20261009040000_audit_privileges_hardening.sql — privilegi minimi su sector_pack_audit e sulle tabelle riservate al servizio.
--
-- PROBLEMA (verificato sul database il 9/10/2026): sector_pack_audit è append-only per trigger (UPDATE/DELETE)
-- ma anon, authenticated e service_role avevano TRUNCATE, REFERENCES, TRIGGER (e MAINTAIN su Postgres 17).
-- L'origine è nei privilegi predefiniti (pg_default_acl) dello schema public per il ruolo postgres, che a OGNI nuova
-- tabella assegnano questi privilegi. TRUNCATE non attiva i trigger di riga: svuota lo storico in un colpo solo.
-- Gli stessi privilegi superflui sono presenti su altre sette tabelle usate solo dal backend (service_role).
--
-- EFFETTO:
--  1) sector_pack_audit: anon e authenticated senza alcun privilegio; service_role solo SELECT e INSERT.
--  2) agent_registry, clienti, jarvis_summaries, sector_eval_runs, sector_faq, sector_profiles, sector_test_scenarios:
--     a) anon e authenticated: tolti TUTTI i privilegi. Oggi avevano solo privilegi di struttura (TRUNCATE, REFERENCES,
--        TRIGGER, MAINTAIN) e nessun privilegio di lettura/scrittura, quindi il comportamento dell'applicazione non cambia:
--        il codice (api/, lib/) usa soltanto la chiave service_role (verificato con grep).
--     b) service_role: tolti SOLO i privilegi di struttura TRUNCATE, REFERENCES, TRIGGER e, dove esiste (Postgres >= 17),
--        MAINTAIN. I privilegi sui dati (SELECT/INSERT/UPDATE/DELETE) NON vengono toccati: il backend ne ha bisogno
--        (es. lib/admin/pack-pipeline.js fa DELETE su sector_faq e sector_test_scenarios).
--        Verificato su relacl di produzione il 9/10/2026: service_role aveva arwdDxtm (jarvis_summaries arwDxtm, senza DELETE).
--  Nessuna policy RLS viene aggiunta: RLS attivo e nessuna policy = nessun accesso per anon/authenticated, voluto.
-- PRECONDIZIONI: ruolo postgres (SQL editor di Supabase). Nessun dato letto o modificato.
-- IDEMPOTENTE: rilanciabile senza effetti collaterali. Funziona su Postgres 15, 16 e 17: MAINTAIN compare nel comando solo se server_version_num >= 170000
-- (su 15/16 la parola darebbe errore di sintassi), e la stringa è costruita a runtime, quindi non viene mai analizzata sulle versioni vecchie.
-- ROLLBACK (riporta ai privilegi di prima, sconsigliato):
--   grant truncate, references, trigger on table public.sector_pack_audit to anon, authenticated, service_role;
--   (e, per le sette tabelle: grant truncate, references, trigger [, maintain su PG17] on table public.<tabella> to service_role;)
do $$
declare t text; strutturali text := 'truncate, references, trigger';
begin
  if current_setting('server_version_num')::int >= 170000 then strutturali := strutturali || ', maintain'; end if;

  if to_regclass('public.sector_pack_audit') is not null then
    revoke all on table public.sector_pack_audit from anon, authenticated;
    revoke all on table public.sector_pack_audit from service_role;
    grant select, insert on table public.sector_pack_audit to service_role;
  end if;

  foreach t in array array['agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_profiles','sector_test_scenarios']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', t);
      execute format('revoke %s on table public.%I from service_role', strutturali, t);
    end if;
  end loop;
end $$;
