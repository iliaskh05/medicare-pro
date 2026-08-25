-- Production audit: link exams to resources; payment source on exam ledger; display prefs seeds.
-- Does not modify V1–V13.

ALTER TABLE examens
    ADD COLUMN IF NOT EXISTS resource_id BIGINT REFERENCES resources (id);

CREATE INDEX IF NOT EXISTS idx_examens_resource_id ON examens (resource_id);

ALTER TABLE paiements_examen
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS source_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_paiements_examen_source
    ON paiements_examen (source_type, source_id);

INSERT INTO app_settings (setting_key, setting_value) VALUES
    ('display.agenda', 'calendar'),
    ('display.worklist', 'table'),
    ('display.patients', 'table'),
    ('display.appointments', 'calendar')
ON CONFLICT (setting_key) DO NOTHING;
