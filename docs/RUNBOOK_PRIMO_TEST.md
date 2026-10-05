# Runbook — dal branch al primo test reale (dentista)

Commit da unire: `baabb0f` (HEAD di `feat/vertical-ai-engine`, 144 test verdi). Non `870c70b`: dopo quello ci sono altri 2 commit (insight dashboard).

## 0. Controllo preliminare (già fatto, solo lettura, 6/10/2026)
- Progetto Supabase `qgljkqlronoeofsytwqm`. Migrazioni applicate finora: fino alla 009 (registrazione pubblica). Le tabelle di 010 e 012 NON esistono ancora.
- Prerequisiti presenti: `clienti`, `configurazioni_cliente`, `richieste_clienti`, `event_log`, `servizi_cliente`, `personale_cliente`, estensione `vector`.
- La 011 modifica `incrementa_utilizzo_mensile(uuid, text)` e `match_knowledge_chunks(uuid, vector, integer)`: entrambe esistono con questa firma.
- Dipendenze: 010 e 011 sono indipendenti. 012 richiede solo `clienti`. Ordine: 010 → 011 → 012 → seed.

## 1. Applicare il database (Supabase → SQL Editor → New query)
Incolla il CONTENUTO di ogni file (non il nome), uno alla volta, premi Run e attendi "Success":
1. `migrations/010_sector_engine.sql`
2. `migrations/011_hardening_search_path.sql`
3. `migrations/012_governance.sql`
4. `migrations/seed/dentista_v1.sql` (150 KB: se l'editor rifiuta il testo, dividilo a metà alla fine di un `insert`)

NON eseguire ancora `dentista_v1_PROMUOVI.sql`: il motore si accende solo con quello (passo 4).

### Verifica (Success non basta): incolla ed esegui
```sql
select 'tabelle' k, count(*)::text v from information_schema.tables where table_schema='public'
  and table_name in ('sector_profiles','sector_faq','sector_test_scenarios','sector_eval_runs','ai_action_ledger','agent_registry','tenant_action_policy','approval_requests')
union all select 'attese', '8'
union all select 'profilo dentista', status || ' v' || version from sector_profiles where settore='dentista'
union all select 'valutazione gate', gate_passed::text || ' ' || scenari_passati || '/' || scenari_totali from sector_eval_runs where settore='dentista'
union all select 'trigger ledger', count(*)::text from pg_trigger where tgname in ('ai_ledger_no_update','ai_ledger_no_delete')
union all select 'agenti', count(*)::text from agent_registry
union all select 'rls', count(*)::text from pg_tables where schemaname='public' and rowsecurity
  and tablename in ('sector_profiles','sector_faq','sector_test_scenarios','sector_eval_runs','ai_action_ledger','agent_registry','tenant_action_policy','approval_requests');
```
Atteso: tabelle 8 (attese 8), profilo dentista `test v1`, gate `true 162/162`, trigger ledger 2, agenti 3, rls 8.
Se qualcosa differisce, FERMATI: non fare merge.

## 2. Merge
GitHub → Pull requests → New → base `main`, compare `feat/vertical-ai-engine` → crea → Merge.
Il merge cambia anche `vercel.json` (regione `fra1`, UE) e il codice del webhook.
Il motore resta spento finché non fai il passo 4: il comportamento per i clienti è quello di prima.

## 3. Vercel
- Deployment di `main` con il commit di merge (verifica il commit, non solo il colore verde).
- Variabili d'ambiente da controllare: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `TWILIO_AUTH_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `VOYAGE_API_KEY`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`.
- NUOVE o ora indispensabili: `TWILIO_ACCOUNT_SID` (serve per inviare il messaggio dopo "Approva ed esegui"; prima serviva solo ai follow-up) e `LEDGER_SALT` (stringa casuale lunga, scelta da te: senza, i riferimenti anonimi nel registro sono meno robusti).
- `ALLOW_UNVERIFIED_WEBHOOK` NON deve essere impostata in produzione.

## 4. Accendere il motore (rollback in 1 minuto)
Esegui `migrations/seed/dentista_v1_PROMUOVI.sql`. Rollback:
```sql
update sector_profiles set status='archived' where settore='dentista' and version=1;
```
(entro 60 secondi il webhook torna al percorso precedente da solo).

## 5. Test reali (numero WhatsApp del dentista)
Trova il tuo `cliente_id`: `select id, nome_attivita from clienti;`

1. **Domanda normale** — scrivi "Ciao, vorrei sapere se avete disponibilità per una visita." Atteso: risposta coerente (chiede nome/preferenze), nessuna cifra o orario inventato. Controlla: `select fase, stato, created_at from event_log order by created_at desc limit 10;` e `select action, autonomy_level, approval from ai_action_ledger where cliente_id='<id>' order by id desc limit 5;` Misura i secondi dalla tua risposta.
2. **Richiesta di approvazione** — imposta l'approvazione per il calendario:
   ```sql
   insert into tenant_action_policy (cliente_id, agent_id, action, autonomy_level)
   values ('<id>','whatsapp','create_calendar_event',4)
   on conflict (cliente_id, agent_id, action) do update set autonomy_level=4;
   ```
   (la policy si rilegge entro 60 s). Completa una prenotazione fino alla scelta dello slot. Atteso: al cliente "lo studio le confermerà l'appuntamento"; in dashboard → Panoramica la card "L'assistente chiede la tua approvazione".
3. **Approva ed esegui** — clicca. Atteso: evento su Google Calendar, WhatsApp di conferma al cliente, messaggio di esito in dashboard, riga `create_calendar_event_executed` nel ledger.
4. **Rifiuto** — ripeti la prenotazione e clicca "Rifiuta". Atteso: nessun evento, riga `create_calendar_event_rejected`.
5. **Errore reale** — ripeti, e PRIMA di cliccare "Approva" cambia il calendario con uno inesistente: `update configurazioni_cliente set google_calendar_id='inesistente@group.calendar.google.com' where cliente_id='<id>';` Atteso: dashboard "Approvata ma non eseguita: …", riga `…_failed` nel ledger, nessun messaggio di conferma al cliente. Poi RIPRISTINA il vero `google_calendar_id`.
   Limite noto: la richiesta fallita non è ripetibile (è già "approved"): serve una nuova richiesta.

A fine test ripristina la policy se vuoi l'esecuzione automatica: `delete from tenant_action_policy where cliente_id='<id>';`
Verifica l'integrità del registro: `node scripts/verifica-ledger.mjs <cliente_id>` (richiede terminale: in alternativa guarda che le righe siano in ordine e non ci siano errori nei log di Vercel).

## 6. Cosa questo test NON dimostra
Qualità del testo generato dall'AI su conversazioni lunghe, tenuta con più clienti in parallelo, consegna reale fuori dalla finestra di 24 ore di WhatsApp.
