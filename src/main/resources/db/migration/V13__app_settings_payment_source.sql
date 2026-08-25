-- Sprint 1 MediCare×Veto patterns: app settings + payment source traceability.
-- Does not modify V1–V12.

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key     VARCHAR(128) NOT NULL PRIMARY KEY,
    setting_value   TEXT NOT NULL,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by_name VARCHAR(255)
);

INSERT INTO app_settings (setting_key, setting_value) VALUES
    ('centre.nom', 'Centre d''Imagerie Bentachfine'),
    ('centre.ville', 'Témara'),
    ('centre.adresse', ''),
    ('centre.telephone', ''),
    ('centre.email', ''),
    ('centre.timezone', 'Africa/Casablanca'),
    ('centre.jours_ouvrables', '["LUN","MAR","MER","JEU","VEN","SAM"]'),
    ('centre.heure_ouverture', '08:00'),
    ('centre.heure_fermeture', '20:00'),
    ('schedule.slot_minutes_default', '30'),
    ('display.default_agenda_view', 'semaine'),
    ('display.default_worklist_view', 'table')
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS source_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_payments_source ON payments (source_type, source_id);
