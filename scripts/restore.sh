#!/usr/bin/env bash
set -euo pipefail

echo "=============================================================================="
echo "AEGIS DISPATCH - DATABASE RESTORE UTILITY (Linux / Unix)"
echo "=============================================================================="

if [ -z "${1:-}" ]; then
    echo "[USAGE] ./scripts/restore.sh <path_to_backup_file>"
    echo "[EXAMPLE] ./scripts/restore.sh data/backups/aegis_dispatch_20261029_100000.mv.db"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "[ERROR] Specified backup file does not exist: $BACKUP_FILE"
    exit 1
fi

echo "[CAUTION] This operation will replace the active database with $BACKUP_FILE!"
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "[INFO] Restore cancelled."
    exit 0
fi

echo "[INFO] Restoring database file..."
cp "$BACKUP_FILE" "data/aegis_dispatch.mv.db"
echo "[SUCCESS] Database restored successfully from $BACKUP_FILE"
echo "[NOTE] Please restart the Aegis Dispatch backend service."
