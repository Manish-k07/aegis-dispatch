#!/usr/bin/env bash
set -euo pipefail

echo "=============================================================================="
echo "AEGIS DISPATCH - DATABASE BACKUP UTILITY (Linux / Unix)"
echo "=============================================================================="

BACKUP_DIR="data/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SNAPSHOT_FILE="$BACKUP_DIR/aegis_dispatch_${TIMESTAMP}.mv.db"

if [ -f "data/aegis_dispatch.mv.db" ]; then
    echo "[INFO] Creating snapshot of H2 database file: $SNAPSHOT_FILE"
    cp "data/aegis_dispatch.mv.db" "$SNAPSHOT_FILE"
    echo "[SUCCESS] Backup created successfully at $SNAPSHOT_FILE"
fi

if [ -n "${POSTGRES_DB:-}" ]; then
    PG_BACKUP="$BACKUP_DIR/aegis_pg_${TIMESTAMP}.sql"
    echo "[INFO] Running pg_dump for database ${POSTGRES_DB}..."
    pg_dump -U "${POSTGRES_USER:-aegis}" -d "$POSTGRES_DB" > "$PG_BACKUP"
    echo "[SUCCESS] PostgreSQL dump created at $PG_BACKUP"
fi

echo "=============================================================================="
