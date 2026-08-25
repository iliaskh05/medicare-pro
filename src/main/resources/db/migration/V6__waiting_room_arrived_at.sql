-- Phase 2: waiting-room timing. Does not modify V1–V5.

ALTER TABLE examens
    ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP(6);

CREATE INDEX IF NOT EXISTS idx_examens_arrived_at ON examens (arrived_at);
CREATE INDEX IF NOT EXISTS idx_examens_workflow_date
    ON examens (workflow_status, date_examen);
