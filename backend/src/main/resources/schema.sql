-- AEGIS DISPATCH DDL Schema (Persistent)
CREATE TABLE IF NOT EXISTS hospitals (
 id UUID PRIMARY KEY, name VARCHAR(160) NOT NULL, phone VARCHAR(40), designated_ed_phone VARCHAR(40), address VARCHAR(300) NOT NULL,
 latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL,
 status VARCHAR(30) NOT NULL, emergency_department BOOLEAN NOT NULL DEFAULT TRUE,
 icu_available BOOLEAN NOT NULL DEFAULT FALSE, cardiac_services BOOLEAN NOT NULL DEFAULT FALSE,
 pediatric_services BOOLEAN NOT NULL DEFAULT FALSE, maternity_services BOOLEAN NOT NULL DEFAULT FALSE,
 total_beds INT NOT NULL DEFAULT 120, available_beds INT NOT NULL DEFAULT 34,
 icu_beds_total INT NOT NULL DEFAULT 20, icu_beds_available INT NOT NULL DEFAULT 5,
 trauma_bays_total INT NOT NULL DEFAULT 8, trauma_bays_available INT NOT NULL DEFAULT 3,
 cath_lab_operational BOOLEAN NOT NULL DEFAULT TRUE,
 demo_data BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS designated_ed_phone VARCHAR(40);

CREATE TABLE IF NOT EXISTS hospital_capabilities (
 hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
 capability VARCHAR(60) NOT NULL,
 PRIMARY KEY(hospital_id, capability)
);

CREATE TABLE IF NOT EXISTS ambulances (
 id UUID PRIMARY KEY, registration_number VARCHAR(40) UNIQUE NOT NULL, type VARCHAR(40) NOT NULL,
 status VARCHAR(40) NOT NULL, driver_name VARCHAR(120), emt_name VARCHAR(120),
 latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, speed DOUBLE PRECISION NOT NULL DEFAULT 0,
 heading DOUBLE PRECISION NOT NULL DEFAULT 0, last_location_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ambulance_capabilities (
 ambulance_id UUID NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
 capability VARCHAR(60) NOT NULL,
 PRIMARY KEY(ambulance_id, capability)
);

CREATE TABLE IF NOT EXISTS emergencies (
 id UUID PRIMARY KEY, caller_name VARCHAR(120) NOT NULL, phone VARCHAR(40) NOT NULL, type VARCHAR(40) NOT NULL,
 patient_count INT NOT NULL CHECK(patient_count > 0), priority VARCHAR(20) NOT NULL, description TEXT,
 latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, address VARCHAR(300) NOT NULL,
 status VARCHAR(40) NOT NULL, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatches (
 id UUID PRIMARY KEY, emergency_id UUID NOT NULL REFERENCES emergencies(id), ambulance_id UUID NOT NULL REFERENCES ambulances(id),
 dispatcher_name VARCHAR(120) NOT NULL, status VARCHAR(40) NOT NULL, distance_km DOUBLE PRECISION NOT NULL,
 eta_minutes DOUBLE PRECISION NOT NULL, score DOUBLE PRECISION NOT NULL, hospital_id UUID REFERENCES hospitals(id),
 assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), accepted_at TIMESTAMP WITH TIME ZONE, completed_at TIMESTAMP WITH TIME ZONE,
 UNIQUE(emergency_id, ambulance_id)
);

CREATE TABLE IF NOT EXISTS ambulance_locations (
 id BIGSERIAL PRIMARY KEY, ambulance_id UUID NOT NULL REFERENCES ambulances(id) ON DELETE CASCADE,
 latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, speed DOUBLE PRECISION NOT NULL,
 heading DOUBLE PRECISION NOT NULL, status VARCHAR(40) NOT NULL, recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
 id BIGSERIAL PRIMARY KEY, actor VARCHAR(120) NOT NULL, action VARCHAR(100) NOT NULL, entity_type VARCHAR(80) NOT NULL,
 entity_id UUID, previous_state TEXT, new_state TEXT, metadata TEXT, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);
CREATE INDEX IF NOT EXISTS idx_ambulances_status ON ambulances(status);
CREATE INDEX IF NOT EXISTS idx_ambulance_locations_time ON ambulance_locations(ambulance_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatches_emergency ON dispatches(emergency_id);
