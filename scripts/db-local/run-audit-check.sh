#!/usr/bin/env bash
# Prova locale (Postgres 15+ senza Supabase e senza pgTAP) delle migration di privilegi e dei test supabase/tests/database/.
# Uso: PGHOST=/tmp PGPORT=55432 PGUSER=<superuser> scripts/db-local/run-audit-check.sh
# Limiti dichiarati: stato di partenza RIPRODOTTO (fixture), non il database reale; Postgres locale può essere < 17 (niente MAINTAIN);
# pgvector non è disponibile, quindi la proposta migrations/proposte/*vector* NON è provata qui.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=audit_check_$$
psql -qX -d postgres -c "create database $DB" >/dev/null
trap 'psql -qX -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
P="psql -qX -v ON_ERROR_STOP=1 -d $DB"
$P -f scripts/db-local/fixture-prod-state.sql
$P -f scripts/db-local/pgtap-shim.sql
$P -c "set role postgres" -f migrations/016_sector_pack_audit.sql >/dev/null
# I test chiudono con ROLLBACK: i risultati si leggono PRIMA di finish(), nella stessa transazione.
risultati() {
  for f in supabase/tests/database/audit_privileges.sql supabase/tests/database/default_privileges.sql; do
    sed -e 's/^select \* from finish();$/select n, case when ok then $$ok$$ else $$NOT OK$$ end as esito, descr, coalesce(detail,$$$$) as dettaglio from tap.res order by n;/' "$f" | psql -qX -At -F ' | ' -d $DB 2>&1 | grep -E '^[0-9]+ \|' || true
  done
}
echo "###### PRIMA delle migration (stato di produzione riprodotto)"; risultati
$P -c "set role postgres" -f migrations/20261009040000_audit_privileges_hardening.sql
$P -f migrations/20261009040100_default_privileges_hardening.sql
echo "###### DOPO le migration"; risultati
echo "###### SECONDA ESECUZIONE (idempotenza)"
$P -f migrations/20261009040000_audit_privileges_hardening.sql; $P -f migrations/20261009040100_default_privileges_hardening.sql; echo "nessun errore"
