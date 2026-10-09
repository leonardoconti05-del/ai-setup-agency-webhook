# Migration già applicate al database ma mancanti dal repository

Il 9/10/2026 la cronologia delle migration di Supabase (`supabase_migrations.schema_migrations`) conteneva sei voci senza file nel repo.
Questi file sono il testo ESATTO registrato dal database (stesso MD5 della cronologia), recuperato in sola lettura.

**NON rieseguirli sul database di produzione: sono già applicati.** Servono a ricostruire un ambiente nuovo e come riferimento.
Per ricostruire un ambiente da zero l'ordine corretto è quello della versione (prefisso numerico), mescolando questi file con quelli in `migrations/`.

| Versione | Nome | MD5 (db = file) |
|---|---|---|
| 20260929210934 | enable_rls_knowledge_base | f5c88f5ff9d678aaf9b15f24e19ddf08 |
| 20260929215025 | 008_fix_grants_documents_event_log | cfc471921ddefa7fee0ae8831a34a1c0 |
| 20261006161416 | core_hardening | 2a3718c0bb97868adb7149ddf7b5a9c4 |
| 20261006164232 | enable_pgtap_testing | dd80faa7d9b5d90a935cbd1a1fa12161 |
| 20261006164530 | tenant_aware_rls_boundary | e650282bd31b239daf5c0f9697327634 |
| 20261007095900 | emergency_escalation_action | 6b9ccab98f4bf1affb95458f337471cb |

## Schema di base ricostruito (non è testo originale)
`20260901000000_baseline_schema_ricostruito.sql` crea le sette tabelle di base (`clienti`, `configurazioni_cliente`, `jarvis_summaries`, `richieste_clienti`, `richieste_pazienti`, `utilizzo_mensile`, `whatsapp_conversations`) che non hanno nessun file di creazione né voce nella cronologia (le migration 001-003 citate in `docs/DECISIONS.md` non esistono). È stato **ricostruito dal catalogo di produzione, in sola lettura e senza dati**: non ha MD5 di riferimento perché il testo originale è perso. Serve solo a ricostruire un ambiente di TEST (vedi `scripts/db-test/README.md`). Mai sulla produzione.

Il caso opposto (file nel repo, oggetti presenti nel database, ma assenti dalla cronologia perché applicati a mano) riguarda
`004_observability`, `010_sector_engine`, `011_hardening_search_path`, `012_governance`, `013_grants_service_role`,
`014_lacune_conoscenza`, `016_sector_pack_audit`: vedi docs/AUDIT_FASE1.md.
