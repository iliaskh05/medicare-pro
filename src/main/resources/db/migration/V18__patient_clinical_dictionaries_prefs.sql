-- V18: clinical alerts, exam timestamps, medical dictionaries, user preferences

-- Patient clinical / contact enrichment
ALTER TABLE patients ADD COLUMN IF NOT EXISTS titre VARCHAR(16);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_domicile VARCHAR(32);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS telephone_travail VARCHAR(32);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS fax VARCHAR(32);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pays VARCHAR(64) DEFAULT 'Maroc';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS convention_type VARCHAR(64);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS vip BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pacemaker BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pregnant BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contrast_allergy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_alerts TEXT;

-- Exam operational timestamps (server-side)
ALTER TABLE examens ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE examens ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE examens ADD COLUMN IF NOT EXISTS promised_at TIMESTAMP;
ALTER TABLE examens ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6, 2);
ALTER TABLE examens ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6, 2);
ALTER TABLE examens ADD COLUMN IF NOT EXISTS general_anesthesia BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE examens ADD COLUMN IF NOT EXISTS inpatient BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE examens ADD COLUMN IF NOT EXISTS urgent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE examens ADD COLUMN IF NOT EXISTS technologist_name VARCHAR(120);
ALTER TABLE examens ADD COLUMN IF NOT EXISTS nurse_name VARCHAR(120);
ALTER TABLE examens ADD COLUMN IF NOT EXISTS assistant_name VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_examens_started_at ON examens (started_at);
CREATE INDEX IF NOT EXISTS idx_examens_completed_at ON examens (completed_at);
CREATE INDEX IF NOT EXISTS idx_patients_vip ON patients (vip) WHERE vip = TRUE;

-- Medical dictionaries
CREATE TABLE IF NOT EXISTS dictionary_anatomical_zones (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_dict_anat_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS dictionary_pathology_families (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_dict_path_family_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS dictionary_pathologies (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT REFERENCES dictionary_pathology_families (id) ON DELETE SET NULL,
    code VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_dict_pathology_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_dict_pathologies_family ON dictionary_pathologies (family_id);
CREATE INDEX IF NOT EXISTS idx_dict_pathologies_active ON dictionary_pathologies (active);
CREATE INDEX IF NOT EXISTS idx_dict_anat_active ON dictionary_anatomical_zones (active);

-- Per-user UI preferences (JSON blob)
CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
    preference_key VARCHAR(128) NOT NULL,
    preference_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_pref UNIQUE (user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences (user_id);
