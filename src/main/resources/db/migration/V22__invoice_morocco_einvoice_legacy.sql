-- Unified invoice model: Moroccan fiscal fields, e-invoice readiness,
-- concurrency-safe numbering, VAT line columns, legacy exam payment backfill.
-- Does not drop examens.montant / acompte / paiements_examen.

CREATE TABLE IF NOT EXISTS invoice_sequences (
    series      VARCHAR(32) NOT NULL,
    year        INTEGER     NOT NULL,
    last_value  BIGINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (series, year)
);

INSERT INTO invoice_sequences (series, year, last_value)
SELECT 'FAC', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0
WHERE NOT EXISTS (
    SELECT 1 FROM invoice_sequences WHERE series = 'FAC' AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS series VARCHAR(32);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS document_kind VARCHAR(32);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_ht NUMERIC(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_tva NUMERIC(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_ice VARCHAR(32);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_if VARCHAR(32);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_taxe_professionnelle VARCHAR(32);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_ice VARCHAR(32);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_if VARCHAR(32);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS legal_mentions TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS related_invoice_id BIGINT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electronic_status VARCHAR(32);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electronic_external_ref VARCHAR(128);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electronic_hash VARCHAR(128);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electronic_transmitted_at TIMESTAMP(6);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electronic_response_at TIMESTAMP(6);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electronic_rejection_reason VARCHAR(512);

UPDATE invoices SET series = 'FAC' WHERE series IS NULL;
UPDATE invoices SET document_kind = 'INVOICE' WHERE document_kind IS NULL;
UPDATE invoices SET vat_rate = 0 WHERE vat_rate IS NULL;
UPDATE invoices SET total_ht = COALESCE(total, 0) WHERE total_ht IS NULL;
UPDATE invoices SET total_tva = 0 WHERE total_tva IS NULL;
UPDATE invoices SET electronic_status = 'ISSUED' WHERE electronic_status IS NULL AND statut <> 'DRAFT';
UPDATE invoices SET electronic_status = 'DRAFT' WHERE electronic_status IS NULL;

ALTER TABLE invoices ALTER COLUMN series SET DEFAULT 'FAC';
ALTER TABLE invoices ALTER COLUMN document_kind SET DEFAULT 'INVOICE';
ALTER TABLE invoices ALTER COLUMN vat_rate SET DEFAULT 0;
ALTER TABLE invoices ALTER COLUMN total_ht SET DEFAULT 0;
ALTER TABLE invoices ALTER COLUMN total_tva SET DEFAULT 0;
ALTER TABLE invoices ALTER COLUMN electronic_status SET DEFAULT 'DRAFT';

ALTER TABLE invoices ALTER COLUMN series SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN document_kind SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN vat_rate SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN total_ht SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN total_tva SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN electronic_status SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_related_invoice'
    ) THEN
        ALTER TABLE invoices
            ADD CONSTRAINT fk_invoices_related_invoice
            FOREIGN KEY (related_invoice_id) REFERENCES invoices (id);
    END IF;
END $$;

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS code VARCHAR(64);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS modalite VARCHAR(32);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5, 2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12, 2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS total_ht NUMERIC(12, 2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS total_ttc NUMERIC(12, 2);

UPDATE invoice_items SET discount = 0 WHERE discount IS NULL;
UPDATE invoice_items SET vat_rate = 0 WHERE vat_rate IS NULL;
UPDATE invoice_items SET vat_amount = 0 WHERE vat_amount IS NULL;
UPDATE invoice_items SET total_ht = COALESCE(line_total, 0) WHERE total_ht IS NULL;
UPDATE invoice_items SET total_ttc = COALESCE(line_total, 0) WHERE total_ttc IS NULL;

ALTER TABLE invoice_items ALTER COLUMN discount SET DEFAULT 0;
ALTER TABLE invoice_items ALTER COLUMN vat_rate SET DEFAULT 0;
ALTER TABLE invoice_items ALTER COLUMN vat_amount SET DEFAULT 0;
ALTER TABLE invoice_items ALTER COLUMN total_ht SET DEFAULT 0;
ALTER TABLE invoice_items ALTER COLUMN total_ttc SET DEFAULT 0;

ALTER TABLE invoice_items ALTER COLUMN discount SET NOT NULL;
ALTER TABLE invoice_items ALTER COLUMN vat_rate SET NOT NULL;
ALTER TABLE invoice_items ALTER COLUMN vat_amount SET NOT NULL;
ALTER TABLE invoice_items ALTER COLUMN total_ht SET NOT NULL;
ALTER TABLE invoice_items ALTER COLUMN total_ttc SET NOT NULL;

CREATE TABLE IF NOT EXISTS invoice_electronic_events (
    id          BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    invoice_id  BIGINT NOT NULL REFERENCES invoices (id),
    status      VARCHAR(32) NOT NULL,
    detail      TEXT,
    created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_electronic_events_invoice
    ON invoice_electronic_events (invoice_id, created_at);

INSERT INTO app_settings (setting_key, setting_value, updated_at)
VALUES
    ('billing.invoice.series', 'FAC', CURRENT_TIMESTAMP),
    ('billing.invoice.number-format', 'FAC-{year}-{seq}', CURRENT_TIMESTAMP),
    ('billing.vat.default-rate', '0', CURRENT_TIMESTAMP),
    (
        'billing.legal-mentions',
        'TVA non applicable — art. 91 du CGI (prestations de soins). Document commercial interne, distinct d''une facture électronique certifiée DGI.',
        CURRENT_TIMESTAMP
    ),
    ('billing.payment-terms', 'Paiement à réception, au secrétariat du centre.', CURRENT_TIMESTAMP),
    ('centre.ice', '', CURRENT_TIMESTAMP),
    ('centre.if', '', CURRENT_TIMESTAMP),
    ('centre.taxe_professionnelle', '', CURRENT_TIMESTAMP)
ON CONFLICT (setting_key) DO NOTHING;

-- Backfill invoices from exams that have a recorded amount and no invoice line yet.
INSERT INTO invoices (
    reference, patient_id, statut, total, amount_paid, amount_refunded,
    insurance_share, patient_share, remise, mode_paiement, notes,
    issued_at, created_at, updated_at, version,
    series, document_kind, service_date, total_ht, total_tva, vat_rate,
    electronic_status
)
SELECT
    'MIG-' || e.id,
    e.patient_id,
    CASE
        WHEN COALESCE(e.acompte, 0) >= COALESCE(e.montant, 0) AND COALESCE(e.montant, 0) > 0 THEN 'PAID'
        WHEN COALESCE(e.acompte, 0) > 0 THEN 'PARTIALLY_PAID'
        ELSE 'ISSUED'
    END,
    COALESCE(e.montant, 0),
    LEAST(COALESCE(e.acompte, 0), COALESCE(e.montant, 0)),
    0,
    0,
    GREATEST(COALESCE(e.montant, 0) - COALESCE(e.acompte, 0), 0),
    0,
    NULL,
    'Migration ledger examen → facture (V22). Colonnes examen conservées.',
    COALESCE(e.date_examen, CURRENT_TIMESTAMP),
    COALESCE(e.date_examen, CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP,
    0,
    'MIG',
    'INVOICE',
    CAST(COALESCE(e.date_examen, CURRENT_TIMESTAMP) AS DATE),
    COALESCE(e.montant, 0),
    0,
    0,
    'ISSUED'
FROM examens e
WHERE e.patient_id IS NOT NULL
  AND COALESCE(e.montant, 0) > 0
  AND NOT EXISTS (
      SELECT 1 FROM invoice_items ii WHERE ii.examen_id = e.id
  );

INSERT INTO invoice_items (
    invoice_id, examen_id, catalogue_id, label, quantity, unit_price, line_total,
    created_at, code, modalite, discount, vat_rate, vat_amount, total_ht, total_ttc
)
SELECT
    i.id,
    e.id,
    e.catalogue_id,
    COALESCE(NULLIF(e.description, ''), 'Acte d''imagerie'),
    1,
    COALESCE(e.montant, 0),
    COALESCE(e.montant, 0),
    COALESCE(e.date_examen, CURRENT_TIMESTAMP),
    NULL,
    CAST(e.modalite AS VARCHAR),
    0,
    0,
    0,
    COALESCE(e.montant, 0),
    COALESCE(e.montant, 0)
FROM invoices i
JOIN examens e ON i.reference = 'MIG-' || e.id
WHERE NOT EXISTS (
    SELECT 1 FROM invoice_items ii WHERE ii.examen_id = e.id
);

INSERT INTO payments (invoice_id, montant, mode, created_by_name, created_at, source_type, source_id)
SELECT
    i.id,
    p.montant,
    COALESCE(NULLIF(p.mode, ''), 'especes'),
    p.created_by,
    COALESCE(p.created_at, CURRENT_TIMESTAMP),
    'EXAM_LEDGER',
    CAST(p.id AS VARCHAR)
FROM paiements_examen p
JOIN examens e ON e.id = p.examen_id
JOIN invoices i ON i.reference = 'MIG-' || e.id
WHERE NOT EXISTS (
    SELECT 1 FROM payments pay
    WHERE pay.source_type = 'EXAM_LEDGER' AND pay.source_id = CAST(p.id AS VARCHAR)
);

-- Align sequence with existing FAC-YYYY-NNNNNN numbers for the current year.
UPDATE invoice_sequences s
SET last_value = GREATEST(
    s.last_value,
    COALESCE((
        SELECT MAX(CAST(RIGHT(i.reference, 6) AS BIGINT))
        FROM invoices i
        WHERE i.series = s.series
          AND i.reference ~ ('^' || s.series || '-' || s.year || '-[0-9]{6}$')
    ), 0)
);

CREATE INDEX IF NOT EXISTS idx_invoices_electronic_status ON invoices (electronic_status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_code ON invoice_items (code);
