-- Scores d'anomalies ML (Spring Boot ↔ service Python)
CREATE TABLE IF NOT EXISTS anomaly_operations (
    id BIGSERIAL PRIMARY KEY,
    operation_id VARCHAR(64) NOT NULL,
    invoice_id BIGINT REFERENCES invoices (id) ON DELETE SET NULL,
    examen_id BIGINT REFERENCES examens (id) ON DELETE SET NULL,
    patient_id BIGINT REFERENCES patients (id) ON DELETE SET NULL,
    operator_id BIGINT,
    anomaly_score INTEGER NOT NULL DEFAULT 0,
    niveau VARCHAR(32) NOT NULL DEFAULT 'faible',
    cluster_id INTEGER,
    cluster_distance NUMERIC(12, 4),
    isolation_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    isolation_score NUMERIC(8, 2),
    triggered_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    features JSONB,
    model_version VARCHAR(64),
    decision VARCHAR(32) NOT NULL DEFAULT 'pending',
    catalogue_price NUMERIC(12, 2),
    billed_amount NUMERIC(12, 2),
    discount_amount NUMERIC(12, 2),
    reviewed_at TIMESTAMP,
    reviewed_by_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_anomaly_operation_id UNIQUE (operation_id)
);

CREATE INDEX IF NOT EXISTS idx_anomaly_operations_score ON anomaly_operations (anomaly_score DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_operations_decision ON anomaly_operations (decision);
CREATE INDEX IF NOT EXISTS idx_anomaly_operations_patient ON anomaly_operations (patient_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_operations_created ON anomaly_operations (created_at DESC);
