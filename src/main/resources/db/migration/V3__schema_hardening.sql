-- Persistence hardening only.
-- Intentionally does NOT create appointments, waiting_queue, invoices, payments,
-- DICOM, notifications or fraud tables. Those belong to later product phases.

-- PostgreSQL does not auto-index foreign keys.
CREATE INDEX IF NOT EXISTS idx_historique_examen_examen ON historique_examen (examen_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_utilisateur ON password_reset_tokens (utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients (created_by_id);
CREATE INDEX IF NOT EXISTS idx_examens_created_by ON examens (created_by_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_deleted_at ON utilisateurs (deleted_at);

-- Legacy columns created outside JPA (Python import / old Hibernate entity).
-- Kept so existing rows and scripts keep working. Not mapped by current entities.
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE medecins_referents
    ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;

-- numero_dossier is unique in JPA; every existing row must have a value.
UPDATE patients
SET numero_dossier = 'PAT-' || LPAD(id::text, 6, '0')
WHERE numero_dossier IS NULL;

ALTER TABLE patients ALTER COLUMN numero_dossier SET NOT NULL;
