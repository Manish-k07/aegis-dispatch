-- =============================================================================
-- AEGIS DISPATCH ROLLBACK SCRIPT
-- Safely reverts schema changes and feature extensions in reverse dependency order.
-- =============================================================================

-- 1. Drop added indexes
DROP INDEX IF EXISTS idx_emergencies_phone;
DROP INDEX IF EXISTS idx_users_phone;
DROP INDEX IF EXISTS idx_dispatches_emergency;
DROP INDEX IF EXISTS idx_ambulance_locations_time;
DROP INDEX IF EXISTS idx_ambulances_status;
DROP INDEX IF EXISTS idx_emergencies_status;
DROP INDEX IF EXISTS idx_incident_events_incident;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_google_sub;

-- 2. Drop audit and event tables
DROP TABLE IF EXISTS incident_events CASCADE;

-- 3. Drop emergency feature extensions
ALTER TABLE emergencies DROP COLUMN IF EXISTS other_type_description;
ALTER TABLE emergencies DROP COLUMN IF EXISTS cancel_reason_code;
ALTER TABLE emergencies DROP COLUMN IF EXISTS cancel_reason_text;
ALTER TABLE emergencies DROP COLUMN IF EXISTS cancelled_at;
ALTER TABLE emergencies DROP COLUMN IF EXISTS cancelled_by;
ALTER TABLE emergencies DROP COLUMN IF EXISTS sos_triggered_at;
ALTER TABLE emergencies DROP COLUMN IF EXISTS location_accuracy;
ALTER TABLE emergencies DROP COLUMN IF EXISTS location_source;
ALTER TABLE emergencies DROP COLUMN IF EXISTS device_info;

-- 4. Drop citizen auth columns
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verified;
ALTER TABLE users DROP COLUMN IF EXISTS profile_complete;
ALTER TABLE users DROP COLUMN IF EXISTS auth_provider;
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS google_sub;

-- End of rollback script
