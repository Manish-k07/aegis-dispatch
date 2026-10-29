# Aegis Dispatch • Rollback Procedures & Strategy

This document outlines the standard operating procedures for rolling back application code and database schema in production.

---

## 1. Application Code Rollback

1. **Blue/Green or Container Deployment**:
   - Revert the container image tag or git commit to the previous known good release tag:
     ```bash
     git checkout <previous-release-tag>
     # Or redeploy previous container digest
     docker compose pull aegis-dispatch:<stable-tag>
     docker compose up -d aegis-dispatch
     ```

2. **Configuration Reversion**:
   - Verify that `.env` or system environment variables match the previous release requirements.
   - Confirm that the `JWT_SECRET` has not been invalidated unless security credentials were compromised.

---

## 2. Database Schema Rollback

The backend provides a standardized, idempotent rollback script:
`backend/src/main/resources/rollback.sql`

### What it Reverts:
- Drops auxiliary performance indexes (`idx_users_phone`, `idx_emergencies_phone`, etc.)
- Reverts `incident_events` audit table
- Drops added emergency columns (`other_type_description`, `cancel_reason_code`, `device_info`, etc.)
- Drops added citizen user columns (`google_sub`, `email`, `phone_verified`, `profile_complete`, etc.)

### Execution Methods:
- **Windows**:
  ```cmd
  scripts\rollback.bat
  ```
- **Linux/Unix**:
  ```bash
  chmod +x scripts/rollback.sh
  ./scripts/rollback.sh
  ```
- **Direct PostgreSQL execution**:
  ```bash
  psql -U aegis -d aegis_dispatch -f backend/src/main/resources/rollback.sql
  ```

---

## 3. Post-Rollback Verification Checklist

- [ ] Backend health check responds `UP`: `curl -i http://localhost:8080/actuator/health`
- [ ] Database schema validator runs without missing column warnings.
- [ ] Dispatcher login and live CAD dashboard load properly.
- [ ] WebSockets connect cleanly to `/ws`.
