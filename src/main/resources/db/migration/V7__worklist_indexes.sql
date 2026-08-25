-- Phase 3: worklist query indexes. Does not modify V1–V6.

CREATE INDEX IF NOT EXISTS idx_examens_date_modalite
    ON examens (date_examen, modalite);

CREATE INDEX IF NOT EXISTS idx_examens_radiologue_date
    ON examens (assigned_radiologue_id, date_examen);

CREATE INDEX IF NOT EXISTS idx_examens_priorite_date
    ON examens (priorite, date_examen);
