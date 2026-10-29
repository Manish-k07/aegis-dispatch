# Aegis Dispatch • Backup & Disaster Recovery Guide

This guide details backup automation, storage policies, and recovery procedures for Aegis Dispatch databases.

---

## 1. Backup Strategy & Schedules

| Database Engine | Backup Method | Recommended Frequency | Retention Window |
|-----------------|---------------|-----------------------|------------------|
| **H2 File DB** | File Snapshot (`.mv.db`) | Every 6 hours / Before releases | 30 days (rolling) |
| **PostgreSQL** | `pg_dump` Logical Export | Daily full backup + WAL archiving | 90 days offsite |

---

## 2. Automated Backup Execution

### Windows Scheduled Task / CLI:
Run `scripts\backup.bat`. This automatically:
1. Detects `data\aegis_dispatch.mv.db`.
2. Generates a timestamped snapshot in `data\backups\aegis_dispatch_YYYYMMDD_HHMMSS.mv.db`.
3. If PostgreSQL is configured, executes `pg_dump` to `data\backups\aegis_pg_YYYYMMDD_HHMMSS.sql`.

```cmd
scripts\backup.bat
```

### Linux Cron / CLI:
Add to cron (`crontab -e`):
```cron
0 */6 * * * /opt/aegis-dispatch/scripts/backup.sh >> /var/log/aegis_backup.log 2>&1
```

---

## 3. Disaster Recovery (Restore)

### Restoring from an H2 Snapshot:
1. Stop the Aegis Dispatch backend service:
   ```cmd
   # Ensure java process is stopped
   ```
2. Execute the restore script with the chosen snapshot path:
   ```cmd
   scripts\restore.bat data\backups\aegis_dispatch_20261029_100000.mv.db
   ```
3. Restart the backend service.

### Restoring from PostgreSQL Dump:
```bash
psql -U aegis -d aegis_dispatch -f data/backups/aegis_pg_20261029_100000.sql
```

---

## 4. Recovery Objectives
- **RPO (Recovery Point Objective)**: < 15 minutes with automated snapshots.
- **RTO (Recovery Time Objective)**: < 5 minutes to restore and restart backend services.
