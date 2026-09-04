-- V19: complementary exams + report templates (macros by modality/catalogue)

ALTER TABLE examens ADD COLUMN IF NOT EXISTS parent_examen_id BIGINT;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_examens_parent'
    ) THEN
        ALTER TABLE examens
            ADD CONSTRAINT fk_examens_parent
            FOREIGN KEY (parent_examen_id) REFERENCES examens (id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_examens_parent ON examens (parent_examen_id);

CREATE TABLE IF NOT EXISTS report_templates (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    modalite VARCHAR(32),
    catalogue_id BIGINT REFERENCES catalogue_examens (id) ON DELETE SET NULL,
    indication TEXT,
    technique TEXT,
    resultats TEXT,
    conclusion TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_report_template_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_report_templates_modalite ON report_templates (modalite);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates (active);

INSERT INTO report_templates (code, label, modalite, indication, technique, resultats, conclusion)
VALUES
    ('CT_STD', 'Scanner — trame standard', 'Scanner',
     'Indication clinique à préciser.',
     'Acquisition spiralée, reconstructions multiplanaires.',
     'Pas d''anomalie significative dans les limites de l''examen.',
     'Conclusion à formuler.'),
    ('MRI_STD', 'IRM — trame standard', 'IRM',
     'Indication clinique à préciser.',
     'Séquences T1, T2, éventuellement injection de gadolinium.',
     'Pas d''anomalie significative dans les limites de l''examen.',
     'Conclusion à formuler.'),
    ('US_STD', 'Échographie — trame standard', 'Échographie',
     'Indication clinique à préciser.',
     'Examen échographique en temps réel.',
     'Pas d''anomalie significative dans les limites de l''examen.',
     'Conclusion à formuler.'),
    ('XR_STD', 'Radiographie — trame standard', 'Radiologie',
     'Indication clinique à préciser.',
     'Clichés standards.',
     'Pas d''anomalie significative dans les limites de l''examen.',
     'Conclusion à formuler.'),
    ('MG_STD', 'Mammographie — trame standard', 'Mammographie',
     'Dépistage / diagnostic.',
     'Incidences standard ± complémentaires.',
     'Classification BIRADS à préciser.',
     'Conclusion et conduite à tenir.')
ON CONFLICT (code) DO NOTHING;
