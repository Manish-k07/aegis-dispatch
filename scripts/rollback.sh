#!/usr/bin/env bash
set -euo pipefail

echo "=============================================================================="
echo "AEGIS DISPATCH - DATABASE ROLLBACK SCRIPT RUNNER (Linux / Unix)"
echo "=============================================================================="

ROLLBACK_SQL="backend/src/main/resources/rollback.sql"

if [ ! -f "$ROLLBACK_SQL" ]; then
    echo "[ERROR] Rollback SQL script not found at $ROLLBACK_SQL"
    exit 1
fi

echo "[CAUTION] This will execute rollback.sql to drop extended citizen auth columns, indexes, and event tables!"
read -p "Are you sure you want to run database rollback? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "[INFO] Rollback cancelled."
    exit 0
fi

if [ -n "${POSTGRES_DB:-}" ]; then
    echo "[INFO] Running rollback against PostgreSQL: $POSTGRES_DB"
    psql -U "${POSTGRES_USER:-aegis}" -d "$POSTGRES_DB" -f "$ROLLBACK_SQL"
    echo "[SUCCESS] Rollback executed."
else
    echo "[NOTE] Rollback script is ready at $ROLLBACK_SQL"
fi
