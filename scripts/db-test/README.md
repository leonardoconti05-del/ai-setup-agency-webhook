# Ricostruzione del database di test (progetto Supabase `ai-setup-agency-test`)

Scopo: eseguire i test pgTAP veri su un database separato dalla produzione. Nessun dato di produzione è stato letto o copiato: dalla produzione è stata
letta **solo la struttura** (catalogo: colonne, vincoli, indici, privilegi, definizione di una funzione).

## Ordine di applicazione (come eseguito il 9/10/2026, PostgreSQL 17.11)
1. `migrations/recovered/20260901000000_baseline_schema_ricostruito.sql` — sette tabelle di base senza alcun file di origine (migration 001-003 perse) + funzione `incrementa_utilizzo_mensile` + una policy. **Ricostruita**, non testo originale.
2. `004_observability`, `005_knowledge_base`, `recovered/…enable_rls_knowledge_base` + `006_follow_up` + `007_analytics` + `recovered/…008_fix_grants`, `008_servizi_personale`, `009_registrazione_pubblica`.
3. `010_sector_engine`, `011_hardening_search_path`, `012_governance`, `013_grants_service_role`, `014_lacune_conoscenza`, `015_action_registry`.
4. `recovered/…core_hardening`, `recovered/…enable_pgtap_testing` (estensione già presente nel progetto di test), `recovered/…tenant_aware_rls_boundary`, `recovered/…emergency_escalation_action`, `20261007110501_explicit_tenant_action_policy`, `016_sector_pack_audit`.
5. `00_allineamento_profilo_produzione.sql` (questa cartella) — un progetto Supabase nuovo concede più privilegi di default della produzione; questo passo li riporta al profilo di produzione, così le migration della PR agiscono sullo stesso stato iniziale.
6. `20261009040000_audit_privileges_hardening`, `20261009040100_default_privileges_hardening`.
Non applicare mai `migrations/proposte/`.

## Differenze volute rispetto ai file del repo
- Omessi i `drop trigger if exists` e il blocco `drop policy` iniziale (su database vuoto non fanno nulla; il connettore usato li blocca come distruttivi).
- Commenti omessi nelle istruzioni incollate (non cambiano l'effetto).

## Verifica di fedeltà (confronto con la produzione, solo catalogo)
Identici: 206 colonne (nome, tipo, default, nullabilità), 53 indici, 6 trigger, 32 policy, privilegi predefiniti, privilegi di tutte le 23 tabelle (normalizzati con `aclexplode`).
Non confrontati: il corpo di tutte le funzioni, le sequenze, i dati (volutamente vuoti).

## Esecuzione dei test
`python3 scripts/db-test/pgtap-come-do-block.py supabase/tests/database/<file>.sql` produce un blocco DO da incollare nell'editor SQL del progetto di test: usa la vera libreria pgTAP e annulla tutto a fine esecuzione.
In CI il job `pgtap` userà invece `supabase test db --db-url "$SUPABASE_DB_URL"` quando il segreto sarà configurato (vedi `docs/AUDIT_FASE1.md`, sezione 8-bis).
