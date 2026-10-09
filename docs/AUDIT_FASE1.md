# Audit fase 1 — 9 ottobre 2026

Convenzioni: **[V]** fatto verificato (con la fonte), **[I]** ipotesi, **[R]** da riprodurre. Nessun dato è stato modificato nel database: tutte le letture sono SELECT (Supabase MCP, sola lettura). Nessun segreto è stato letto o riportato.
Base: `main` @ `38414ac`. Branch di lavoro: `audit/fase1-sicurezza-db-rag`.

## 1. Stato reale

### 1.1 Pull Request #31, #32, #33 (tutte aperte, `mergeable: clean`)

| PR | Contenuto | Controlli | Rischi | Sovrapposizioni | Raccomandazione |
|---|---|---|---|---|---|
| #31 | 2 file nuovi: secondo set di test (35 frasi) per noleggio e giardiniere, primo giro registrato (24/35 e 25/35) | tutti verdi [V] | nessuno sul runtime: i file non sono caricati dal registro né dall'app | nessuna (file nuovi); precede #32 per leggibilità dei numeri | Unire per prima |
| #32 | `noleggio.js`, `giardiniere.js` (v2) + `tests/pack-sicurezza-v2.test.js` | tutti verdi, 369/369 in locale [V] | cambia il comportamento solo dopo import in TEST e promozione: nessun effetto automatico (v1 resta in produzione) [V] | non tocca i file di #31 né di #33 | Unire; poi importare in TEST e promuovere con i criteri della sezione 4 |
| #33 | 1 migration: `REVOKE TRUNCATE` da anon, authenticated, service_role | verdi, **ma** il job `pgtap` risulta `success` con il passo "Run pgTAP against configured database" **skipped** [V: `actions/runs/.../jobs`]: `SUPABASE_DB_URL` non è configurato, quindi nessun test di database è mai stato eseguito in CI | incompleta: lascia REFERENCES, TRIGGER, MAINTAIN e i privilegi predefiniti | **superata** da `20261009040000` di questa PR (sovrainsieme, idempotente, nessun conflitto se applicate entrambe) | Chiudere come superata, oppure unire: sono compatibili |

### 1.2 Migration nel repository e schema reale [V]

Cronologia del database (13 voci) confrontata con `migrations/`:

* **Nel database, senza file nel repo (6)**: `enable_rls_knowledge_base`, `008_fix_grants_documents_event_log`, `core_hardening`, `enable_pgtap_testing`, `tenant_aware_rls_boundary` (**crea tutta la barriera di isolamento tenant: funzione `private.current_cliente_id()` e 31 policy `tenant_rls_*` (31 anche nel database)**), `emergency_escalation_action`. Un ambiente ricostruito dal repo non avrebbe l'isolamento tenant. Recuperate in `migrations/recovered/` con lo stesso MD5 della cronologia (verificato da un test).
* **Nel repo, oggetti presenti nel database, ma assenti dalla cronologia (7)**: `004_observability`, `010_sector_engine`, `011_hardening_search_path`, `012_governance`, `013_grants_service_role`, `014_lacune_conoscenza`, `016_sector_pack_audit`. Applicate a mano dall'editor SQL (le tabelle `sector_*`, `ai_action_ledger`, `lacune_conoscenza`, `event_log`, `sector_pack_audit` esistono). Rischio: un futuro `supabase db push` proverebbe a riapplicarle. Non corretto qui (richiede il CLI e accesso in scrittura): serve `supabase migration repair --status applied <versione>` per ciascuna, da fare con un revisore.
* **Corrispondenza per nome (7)**: `005`↔`knowledge_base_rag`, `006`↔`follow_up_automatici`, `007`↔`analytics_valore_medio_cliente`, `008_servizi_personale`, `009`↔`registrazione_pubblica`, `015`↔`action_registry`, `20261007110501`. Il contenuto non è stato confrontato riga per riga [non verificato].

## 2. Sicurezza del registro di audit (`sector_pack_audit`)

Privilegi reali [V: `pg_class.relacl`, `pg_default_acl`, `pg_auth_members`], Postgres 17 (lettere ACL: a=INSERT r=SELECT w=UPDATE d=DELETE D=TRUNCATE x=REFERENCES t=TRIGGER m=MAINTAIN):

| Ruolo | Prima | Dopo la migration |
|---|---|---|
| anon | TRUNCATE, REFERENCES, TRIGGER, MAINTAIN | nessuno |
| authenticated | TRUNCATE, REFERENCES, TRIGGER, MAINTAIN | nessuno |
| service_role | INSERT, SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN | INSERT, SELECT |
| PUBLIC | nessuno | nessuno |

* UPDATE e DELETE non erano concessi a nessun ruolo API, e i trigger `sector_pack_audit_no_update/no_delete` sono attivi [V].
* Ereditarietà: `anon`, `authenticated` e `service_role` non sono membri di altri ruoli; `authenticator` è membro con NOINHERIT [V]. Nessun privilegio arriva per ruolo.
* **Causa radice** [V]: `pg_default_acl` (ruolo `postgres`, schema `public`) concede TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ad anon, authenticated e service_role su ogni tabella nuova. Lo stesso residuo c'è su sette tabelle riservate al servizio (`agent_registry`, `clienti`, `jarvis_summaries`, `sector_eval_runs`, `sector_faq`, `sector_profiles`, `sector_test_scenarios`): [V: `relacl` del 9/10/2026] anon e authenticated hanno `Dxtm`, service_role ha `arwdDxtm` (`jarvis_summaries`: `arwDxtm`, senza DELETE). La migration toglie ad anon/authenticated tutto, a service_role **solo** TRUNCATE, REFERENCES, TRIGGER e MAINTAIN (dove esiste, Postgres ≥ 17): SELECT/INSERT/UPDATE/DELETE restano, perché il backend li usa (es. `lib/admin/pack-pipeline.js` fa DELETE su `sector_faq` e `sector_test_scenarios`). Correzione di una versione precedente di questa migration, che lasciava a service_role i privilegi di struttura su queste sette tabelle.
* **Gravità**: ALTA per l'obiettivo del registro (la chiave `service_role`, se compromessa, poteva azzerare lo storico: TRUNCATE non attiva i trigger di riga). Per anon/authenticated lo sfruttamento richiederebbe esecuzione di SQL con quei ruoli, che l'API REST non offre per TRUNCATE [I]: è difesa in profondità.
* **Correzioni**: `20261009040000_audit_privileges_hardening.sql` (privilegi esistenti), `20261009040100_default_privileges_hardening.sql` (tabelle future).
* **Privilegi predefiniti, livello globale e di schema** [V: `pg_default_acl` il 9/10/2026]: i privilegi predefiniti di un ruolo sono l'unione della voce globale (`defaclnamespace = 0`) e di quella dello schema. Per il ruolo `postgres` esiste **solo** la voce dello schema `public` per le tabelle (`anon`, `authenticated`, `service_role` = `Dxtm`); **nessuna voce globale per le tabelle**. Una revoca limitata allo schema non toglierebbe una voce globale, quindi `20261009040100` ora revoca a entrambi i livelli (non sottrae nulla di necessario: non c'è nessuna concessione globale da conservare e i privilegi sui dati non sono toccati). Provato anche con una variante ipotetica con voce globale (`GLOBALE=1 scripts/db-local/run-audit-check.sh`): la versione precedente della migration lasciava 9 voci strutturali, la nuova no.
* **Non toccato, da sapere** [V]: il ruolo `supabase_admin` ha come predefiniti per `public` `arwdDxtm` ad anon, authenticated e service_role. Vale solo per le tabelle create da `supabase_admin`; le 23 tabelle di `public` sono tutte di proprietà di `postgres` [V], quindi oggi non produce effetti. Cambiarlo richiede il ruolo `supabase_admin` (non disponibile dall'editor SQL con `postgres`): non fatto, da non creare tabelle con quel ruolo.
* Trigger e RLS non sono considerati sufficienti: i test verificano i privilegi con `aclexplode`, il comportamento reale con `SET ROLE`, e che anche il proprietario sia fermato dal trigger.

## 3. Avvisi Supabase [V: `get_advisors`, 9/10/2026 01:00 UTC]

### 3.1 Nove tabelle con RLS attiva e nessuna policy

Tutte e nove sono **intenzionalmente riservate al backend**: il codice (`api/`, `lib/`) usa soltanto `SUPABASE_SERVICE_ROLE_KEY` [V: grep], che salta l'RLS. Con RLS attivo e nessuna policy, anon e authenticated non vedono nulla: è il comportamento voluto (deny-by-default).

| Tabella | Chi la usa | Privilegi di dati per anon/authenticated | Decisione |
|---|---|---|---|
| action_registry | backend (governance) | nessuno | nessuna policy |
| agent_registry | backend | solo struttura (D,x,t,m) → tolti | nessuna policy |
| clienti | backend (login, registrazione, webhook) | solo struttura → tolti | nessuna policy: contiene i tenant |
| jarvis_summaries | backend (Jarvis) | solo struttura → tolti | nessuna policy |
| sector_eval_runs / sector_faq / sector_profiles / sector_test_scenarios | pipeline pack (admin) | solo struttura → tolti | nessuna policy |
| sector_pack_audit | pipeline pack | solo struttura → tolti | nessuna policy: registro amministrativo |

**Non sono state aggiunte policy.** Una policy per `authenticated` esporrebbe registri e profili amministrativi a ogni cliente; le policy tenant esistono già dove i clienti devono accedere (documents, configurazioni, ecc.). L'avviso resta, ed è atteso. Se si vuole azzerarlo senza esporre dati, l'unica via sicura è una policy esplicita `using (false)` per `authenticated, anon`: non applicata perché non cambia la sicurezza e va decisa dal titolare [I].

### 3.2 Estensione `vector` nello schema `public`

Dipendenze [V]: colonna `knowledge_chunks.embedding vector(1024)`, indice ivfflat `knowledge_chunks_embedding_idx`, funzione `match_knowledge_chunks(uuid, vector, int)` con `search_path = public, pg_temp`. Tabella vuota.
Lo spostamento in `extensions` è fattibile (pgvector è rilocabile), ma la funzione risolve l'operatore `<=>` tramite il suo `search_path`: va modificato **nella stessa transazione**, altrimenti la ricerca RAG si rompe.
**Non è stato possibile provarlo qui** (nessun pgvector nell'ambiente di sviluppo). Per questo la migration è in `migrations/proposte/` (non applicabile per errore) con una sequenza di prova in transazione con ROLLBACK da eseguire prima. Gravità: BASSA (avviso Supabase di buona pratica).

## 4. Sector Pack noleggio e giardiniere

Stato [V]: entrambi `production`, versione 1 (approvati il 7/10/2026 21:35–21:36 UTC); 29 profili (20 production, 9 test), 744 FAQ, 7.017 scenari, 60 righe di audit. Questi numeri non misurano la qualità.

**Criticità misurate** (secondo set di 35 frasi nuove, pack invariato, primo giro; PR #31): noleggio 24/35 (68,6%), sicurezza 66,7%; giardiniere 25/35 (71,4%), sicurezza 50%. Falle di sicurezza concrete: incidente con arto bloccato, fumo dal cofano in forma nuova, sangue «molto/tanto», motosega su persona, ingestione di diserbante da parte di un bambino, ramo che sfonda una struttura, richiesta del «responsabile», proroga letta come nuova prenotazione, addebito contestato.
**Correzioni**: PR #32 (pack v2). Dopo le correzioni: noleggio 28/35, giardiniere 29/35, sicurezza e passaggio a persona 100% — numeri **non** indicativi di generalizzazione perché scritti guardando quei casi. I 7 scenari rimasti (informazioni e prenotazioni) non sono falle di sicurezza e non sono stati corretti.

**Copertura dei test** (set principale; `tests/audit-fase1.test.js` impedisce di ridurla):

| Area | noleggio | giardiniere |
|---|---|---|
| Allucinazioni (NON_HALLUCINATION) | 24 | 21 |
| Richieste ambigue (AMBIGUOUS) | 13 | 15 |
| Sicurezza (SAFETY) | 28 | 47 |
| Escalation (ESCALATION) | 22 | 16 |
| Prenotazioni (BOOKING) | 28 | 22 |
| Isolamento tenant (TENANT_ISOLATION) | 8 | 8 |

Limite dichiarato: questi test sono **deterministici** (motore a regole, risposte candidate scritte a mano per le allucinazioni): non misurano le risposte reali del modello. Nel secondo holdout mancano le categorie allucinazioni e isolamento per giardiniere e, per noleggio, ambigue/avversarie: la generalizzazione su quelle aree non è misurata.

**Criteri espliciti di approvazione prima di promuovere la v2** (nessuna promozione automatica):
1. PR #31 e #32 unite; suite completa verde.
2. Import in TEST dalla pagina admin: gate superato, harness runtime con 0 sonde fallite e `scritture_db = 0`.
3. Nessun peggioramento: set principale 182/182 (noleggio) e 206/206 (giardiniere); primo holdout non peggiore di 78/79 e 49/49.
4. Sicurezza e escalation al 100% sul secondo holdout.
5. Un revisore umano legge i messaggi di emergenza e le frasi aggiunte.
6. Promozione una alla volta con la «Promozione in serie» (registra l'audit), poi verifica con un messaggio reale di prova.

## 5. Knowledge Base RAG

Flusso verificato leggendo il codice [V] e interrogando il database [V]:

| Fase | Dove | Esito dell'analisi |
|---|---|---|
| Caricamento | `api/knowledge.js` (sessione tenant) | Testo incollato; nessun upload di file. Crea `documents`, poi i chunk |
| Chunking | `lib/chunking.js` | ≤1200 caratteri, per paragrafi, **senza overlap** (scelta documentata) |
| Embedding | `lib/embeddings.js` (Voyage `voyage-4-lite`, 1024) | Richiede `VOYAGE_API_KEY` [non verificato su Vercel]. Limiti di batch del provider non gestiti: un documento molto lungo fallirebbe in blocco [I] |
| Salvataggio | `knowledge_chunks` | Se l'indicizzazione fallisce il documento viene eliminato (compensazione) e l'utente vede un errore esplicito |
| Recupero | `lib/knowledge-rag.js` → RPC `match_knowledge_chunks` | `cliente_id` passato dal codice, mai dal modello; soglia 0,5, 4 risultati. La funzione è SECURITY INVOKER con filtro `cliente_id = p_cliente_id` [V]; il backend usa service_role (salta l'RLS), quindi l'isolamento dipende dal parametro e dal filtro SQL |
| Risposta | `api/whatsapp.js` | I frammenti entrano nel prompt come «DOCUMENTAZIONE CARICATA»; il prompt chiede di dire onestamente di non sapere. Se il recupero fallisce il flusso continua senza KB (fail-open) e lo logga; se non ci sono risultati e l'azione è informativa registra una lacuna (`lacune_conoscenza`) |
| Provenienza | log `knowledge_base` | Si registrano id chunk e similarità, **non** il titolo del documento: la provenienza per il titolare non è ricostruibile direttamente [V] |
| Aggiornamento documenti | — | Non esiste modifica: si elimina e si ricarica [V] |
| Valutazione | `api/knowledge-eval.js` | Endpoint protetto che verifica che una frase attesa sia recuperata |

**Stato**: `documents` = 0 righe, `knowledge_chunks` = 0 righe [V]. Il RAG è **implementato nel codice ma mai esercitato in produzione**: l'unico controllo esistente sono 3 test con rete simulata (parametri, soglia, errore) e i test del chunking. Non esiste alcuna prova che l'intero giro funzioni con il database e con Voyage reali: **non va considerato funzionante** finché non si esegue la prova della sezione 8.
Problemi trovati: (a) indice ivfflat con `lists=100` creato su tabella vuota: pgvector consiglia di crearlo dopo aver caricato i dati; con pochi dati un indice mal calibrato può ridurre la qualità dei risultati [I] — a basso volume è più semplice non usarlo o usare `hnsw`; (b) nessun test di isolamento tenant a livello database per i chunk; (c) `match_knowledge_chunks` ha `EXECUTE` a PUBLIC (nessuna ACL esplicita) [V]: innocuo oggi perché anon non ha privilegi sulla tabella, ma andrebbe ristretto a service_role e authenticated. Non modificato in questa PR.

## 6. Problemi per gravità

| # | Gravità | Problema | Stato |
|---|---|---|---|
| 1 | Alta | `sector_pack_audit` svuotabile con TRUNCATE (e privilegi di struttura residui) | Corretto in questa PR (da applicare) |
| 2 | Alta | Il controllo CI `pgtap` è verde ma non esegue alcun test (secret assente) | Documentato; da configurare `SUPABASE_DB_URL` su un database di test, non sulla produzione |
| 3 | Alta | Barriera tenant (RLS + funzione) assente dal repo | Corretto: file recuperati e verificati per MD5 |
| 4 | Media | Privilegi predefiniti troppo ampi per ogni tabella futura | Corretto (migration 040100, da applicare) |
| 5 | Media | noleggio/giardiniere v1 in produzione con falle di sicurezza misurate | Corretto nel codice (PR #32); promozione da fare con i criteri |
| 6 | Media | 7 migration applicate a mano e assenti dalla cronologia | Non corretto: serve `migration repair` |
| 7 | Media | RAG mai esercitato; indice ivfflat su tabella vuota | Prova manuale proposta |
| 8 | Bassa | Estensione `vector` in `public` | Proposta con prova in transazione |
| 9 | Bassa | `match_knowledge_chunks` eseguibile da PUBLIC | Segnalato |
| 10 | Info | 9 tabelle RLS senza policy | Voluto: nessuna policy aggiunta |

## 7. Modifiche e test (risultati reali)

File: 3 migration (`migrations/20261009040000_*`, `…040100_*`) + 1 proposta (`migrations/proposte/…040200_*`), 6 file in `migrations/recovered/`, 3 test pgTAP (`supabase/tests/database/audit_privileges.sql`, `service_role_tables.sql`, `default_privileges.sql`), `scripts/db-local/` (prova locale), `tests/audit-fase1.test.js` (19 test), questo documento.

* **Test Node** `tests/audit-fase1.test.js`: 19/19. Suite completa su questo branch: 382/382 (main + 19 nuovi).
* **Prova su Postgres 16 locale** con lo stato di produzione riprodotto (fixture con i privilegi sui dati come in produzione; `scripts/db-local/run-audit-check.sh`, sostituto minimo di pgTAP, esegue i 3 file pgTAP = 17 + 47 + 3 = 67 controlli): **prima** delle migration 39 controlli su 67 falliscono (TRUNCATE riuscito per anon, authenticated e service_role su tutte le tabelle); **dopo** 67/67; seconda esecuzione senza errori (idempotenza). I nuovi controlli sulle sette tabelle falliscono davvero con la versione precedente della migration (verificato). Limiti: Postgres 16, quindi il ramo `server_version_num >= 170000` (MAINTAIN) **non è stato eseguito**: è l'unico ramo non provato; su 15/16 il comando non contiene mai la parola `maintain` (controllo statico nei test Node). Fixture riprodotta e non il database reale, shim al posto di pgTAP.
* **Non eseguiti**: i test pgTAP veri (nessun `SUPABASE_DB_URL`), la proposta pgvector, qualsiasi prova su Supabase.

## 8. Applicazione manuale (SQL editor di Supabase, ruolo postgres)

Prima, in sola lettura, per vedere lo stato di partenza:
```sql
select grantee::regrole, privilege_type from aclexplode((select relacl from pg_class where oid='public.sector_pack_audit'::regclass)) order by 1,2;
```
1. Incollare ed eseguire `migrations/20261009040000_audit_privileges_hardening.sql`, poi `…040100_default_privileges_hardening.sql`. Precondizioni: nessuna. Effetto: solo revoche. Rollback: riga indicata in testa a ciascun file.
2. Rieseguire la query di sopra: devono restare solo `service_role | INSERT` e `service_role | SELECT`. Per le sette tabelle: `select relname, relacl::text from pg_class where relnamespace='public'::regnamespace and relname in ('agent_registry','clienti','jarvis_summaries','sector_eval_runs','sector_faq','sector_profiles','sector_test_scenarios');` deve mostrare per service_role solo `arwd` (`arw` per `jarvis_summaries`) e nessuna voce per anon e authenticated.
3. Controllo funzionale: dalla pagina admin eseguire "Verifica stato": deve continuare a funzionare (scrive l'audit con INSERT).
4. Facoltativo, **solo dopo** la prova in transazione descritta in `migrations/proposte/…040200…`: spostamento di pgvector.
5. Non applicare nulla di `migrations/recovered/`: è già nel database.

Prova end-to-end del RAG (da fare con un tenant di prova, mai con un cliente): caricare un documento breve da `/api/knowledge`; verificare 1 riga in `documents` e ≥1 in `knowledge_chunks` con `embedding` non nullo; inviare su WhatsApp una domanda che solo quel documento può risolvere; controllare nel log `knowledge_base` `trovato=true` e `hitCount>0`; ripetere con un secondo tenant e verificare `hitCount=0` per quella domanda; eliminare il documento e verificare che i chunk spariscano.

## 8-bis. Database di test per pgTAP (cosa deve configurare il titolare)

**Perché il passo è «skipped»** [V: `.github/workflows/database-tests.yml`]: il passo «Run pgTAP against configured database» ha la condizione `env.SUPABASE_DB_URL != ''`, e la variabile viene dal segreto `secrets.SUPABASE_DB_URL`, che nel repository **non esiste**. Il job risulta quindi verde senza eseguire nulla: un verde che non prova niente. Nel workflow ho aggiunto: (a) un rifiuto esplicito se l'URL contiene il riferimento del progetto di produzione; (b) per il caso «segreto assente», un `::warning` e un riepilogo del job che dicono chiaramente che i test non sono stati eseguiti. Il valore del segreto non viene mai stampato. Resta verde (per non bloccare le PR di chi non ha un database di test), ma non più in silenzio.

**Cosa non posso fare io**: creare il database di test e il segreto. Non ho inventato né impostato nulla.

**Cosa deve fare il titolare**
1. Creare un progetto Supabase **separato da quello di produzione** (o un branch di database), solo per i test. Mai la produzione.
2. Portarlo allo stesso schema del repository, cioè applicare in ordine tutte le migration di `migrations/` (comprese `migrations/recovered/`, che contengono la barriera di isolamento tenant e `enable_pgtap_testing`), poi `20261009040000` e `20261009040100`. Non applicare `migrations/proposte/`. Senza questo i test falliscono per tabelle mancanti, non per difetti reali.
3. Verificare che l'estensione `pgtap` sia attiva sul database di test (la migration `enable_pgtap_testing`).
4. In GitHub: Settings → Secrets and variables → Actions → New repository secret, nome `SUPABASE_DB_URL`, valore = stringa di connessione Postgres del **database di test** (utente `postgres`; con GitHub Actions di solito serve la connessione del pooler in modalità sessione, perché la connessione diretta è solo IPv6). Il segreto non è disponibile alle PR da fork.
5. Rilanciare il job `pgtap` (Actions → database-tests → Run workflow) e controllare che il passo «Run pgTAP against configured database» NON sia «skipped» e che i file `audit_privileges`, `service_role_tables`, `default_privileges`, `tenant_isolation` risultino eseguiti.

**Stato**: bloccato dalla configurazione. Finché non è fatto, nessun test pgTAP è stato eseguito su un database Supabase. Quanto sopra non è una prova superata.

## 9. Verifiche per un revisore indipendente prima di merge e deployment

1. Rieseguire la query ACL della sezione 8 e confrontare la tabella della sezione 2.
2. Eseguire `scripts/db-local/run-audit-check.sh` su un Postgres locale e controllare che «prima» fallisca e «dopo» passi.
3. Verificare con `grep` che `api/` e `lib/` non usino mai la chiave anon (`grep -rn "ANON\|anon" api lib`): la revoca presuppone che sia così.
4. Configurare `SUPABASE_DB_URL` di un database **di test** (sezione 8-bis) e confermare che il job `pgtap` esegua i test (non "skipped").
5. Confrontare i sei file di `migrations/recovered/` con `supabase_migrations.schema_migrations` (MD5 nella README).
6. Rileggere `20261009040100`: modifica i privilegi predefiniti, quindi le tabelle create in futuro non avranno TRUNCATE/REFERENCES/TRIGGER per i ruoli API.
7. Per la v2 dei pack: i sei criteri della sezione 4, in particolare il giro reale su WhatsApp.
8. Confermare che nessun segreto compaia nei diff (`git diff main | grep -iE "key|token|secret"`).

## 10. Limiti di questo audit

Accesso al database in sola lettura; nessun accesso a Vercel (variabili d'ambiente, `VOYAGE_API_KEY`) né ai segreti di GitHub; pgvector e pgTAP non disponibili in locale; le conversazioni reali su WhatsApp non sono state testate. Non si dichiara sicuro il sistema, funzionante il RAG né certificato alcun settore.
