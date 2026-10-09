# Contratto di Jarvis con Core (versione 1, sola lettura)

Obiettivo (da `docs/ARCHITECTURE_MASTER.md` e `docs/PARALLEL_DEVELOPMENT.md`): Jarvis **osserva e propone**; non diventa una seconda fonte dei dati dei clienti e non scrive nel Core. Questo documento chiude due punti aperti: il contratto di salute e il modello di proprietà di `jarvis_summaries`.

## 1. Cosa esiste ora
| Elemento | File | Natura |
|---|---|---|
| Oggetti di contratto (`TenantContext`, `EngineResult`, `GovernedAction`) | `lib/core/contracts.js` | già presenti, invariati |
| `PlatformContext`, `createHealthReport` | `lib/core/contracts.js` | **nuovi**, additivi |
| Lettura dello stato di Core | `lib/core/health.js` (`getCoreHealth`) | **nuovo**, sola lettura |
| Endpoint | `GET /api/core-health` (`lib/core/health-http.js`, rewrite verso la funzione esistente: limite di 12 funzioni) | **nuovo** |
| Ambito dei riepiloghi | `migrations/20261009050000_jarvis_summaries_scope.sql` | **nuova, da applicare a mano** |

## 2. Il contratto di salute
`GET /api/core-health` con `Authorization: Bearer <CORE_HEALTH_TOKEN>` (opzionale `?cliente_id=<uuid>`). Risposta JSON:
`{ contract_version, kind:"core_health", scope:"platform"|"tenant", tenant_id, request_id, generated_at, status:"ok|warn|fail|unknown", checks:[{id,status,detail}], data:{…}, read_only:true }`.

**Ambito piattaforma** (senza `cliente_id`): pack per stato e quelli in production (con controllo che ognuno abbia una valutazione superata; `fail` altrimenti), settori regolamentati in production (`warn`: serve la revisione professionale), eventi e accessi amministrativi falliti nelle ultime 24 ore, numero di attività, errori, approvazioni in attesa, lacune di conoscenza.
**Ambito tenant** (con `cliente_id`): configurazione e pack del settore, documenti e frammenti di conoscenza, errori, approvazioni, lacune: **solo di quel tenant** (filtro `cliente_id` su ogni lettura).

### Garanzie e dove sono verificate (`tests/core-health.test.js`, 21 test)
- **Sola lettura**: l'endpoint accetta solo GET (405 per il resto); il lettore usa solo GET e una lista chiusa di tabelle; il codice non contiene scritture.
- **Riservatezza**: nessuna tabella con testo libero o dati personali (conversazioni, richieste, personale, servizi, `jarvis_summaries`); nel rapporto solo conteggi, stati e identificatori tecnici.
- **Isolamento**: il rapporto di piattaforma non nomina tenant; quello di un tenant non contiene dati di altri.
- **Fail-closed**: token mancante o corto → 503; errato, assente o passato nell'URL → 401; `cliente_id` non UUID → 400; una lettura fallita diventa `unknown`, mai `ok`.
- **Nessun segreto nelle risposte** (token, chiave, indirizzo del database).

### Cosa NON è provato
Nessuna chiamata reale a PostgREST/Vercel: i test usano un database finto e un `fetch` finto. Il token `CORE_HEALTH_TOKEN` non è ancora configurato su Vercel (finché manca l'endpoint risponde 503). Le colonne interrogate sono state controllate sullo schema di produzione, ma la prima chiamata vera va fatta e verificata.

## 3. Modello di proprietà di `jarvis_summaries`
Fatto verificato (sola lettura): contiene 1 riga, `ai_setup_agency_daily`, un riepilogo **di agenzia**, aggregato. Quindi la proprietà oggi è: **piattaforma**, non tenant.
Decisione proposta (da confermare): ogni riepilogo ha un **ambito** esplicito.
- `scope = 'agenzia'`: riepilogo di piattaforma, `cliente_id` NULL, mai esposto ai clienti. La riga esistente diventa questo per default.
- `scope = 'tenant'`: riepilogo di una sola attività, `cliente_id` obbligatorio, eliminato con il cliente.
La tabella resta **solo backend**: RLS attivo, nessuna policy, nessun privilegio a anon/authenticated. Un'eventuale lettura da parte del cliente richiede una decisione separata (policy `tenant_rls_*` con `private.current_cliente_id()`), non inclusa qui.
Compatibilità: l'app Jarvis che scrive `(id, summary, generated_at)` continua a funzionare (gli altri campi hanno default).

## 4. Prove
| Cosa | Dove | Esito |
|---|---|---|
| Test Node del contratto | `tests/core-health.test.js` | 21/21 |
| Migration + vincoli, pgTAP vero su PostgreSQL 17 (progetto di test, via SQL, annullato a fine esecuzione) | `supabase/tests/database/jarvis_summaries_scope.sql` | 11/11 |
| CI `pgtap` | stesso file, quando `SUPABASE_DB_URL` sarà configurato | **non eseguito** |
| Produzione | solo letture di conteggio | nessuna modifica |

## 5. Cosa deve fare il titolare
1. Decidere/confermare il modello `agenzia`/`tenant` (sezione 3).
2. Applicare `20261009050000_jarvis_summaries_scope.sql` nell'editor SQL di Supabase (additiva e idempotente; rollback in testa al file).
3. Su Vercel creare `CORE_HEALTH_TOKEN` (almeno 32 caratteri casuali, solo lì) e rieseguire il deploy; poi dare lo stesso token all'app Jarvis. Mai nel repo.
4. Fare la prima chiamata reale (`curl -H "Authorization: Bearer …" https://<dominio>/api/core-health`) e controllare che `status` e `checks` corrispondano alla realtà (oggi dovrebbe risultare `ok`: 20 pack in production con valutazione superata, nessun errore nelle ultime 24 ore).
5. Il Jarvis che legge deve usare solo questo endpoint, non la chiave `service_role`.

## 6. Fuori da questo contratto (volutamente)
Scritture di Jarvis sul Core, esecuzione di azioni, accesso ai contenuti dei clienti. Quando serviranno passano dall'action gateway (`lib/governance/`), con autonomia e approvazioni, non da questo endpoint.
