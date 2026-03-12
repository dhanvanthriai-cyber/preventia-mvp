-- =============================================================================
-- V6__soap_notes_schema.sql
-- Project Dhanvanthri — SOAP Notes Table
-- Database: PostgreSQL 16 | Flyway managed — never edit after commit
-- Region: AWS Mumbai (ap-south-1) — PHI data residency per DPDP Act 2023
--
-- Creates the soap_notes table (clinical EMR records) and the
-- prescription_status ENUM driving the pharmacy verification workflow.
-- Aligns with ClinicalService session-lock model and PRESCRIPTION_WORKFLOW.md.
-- =============================================================================

-- =============================================================================
-- ENUM: prescription_status
-- State machine per PRESCRIPTION_WORKFLOW.md §State Machine
-- =============================================================================

CREATE TYPE prescription_status AS ENUM (
    'NONE',                       -- No prescription attached to this note
    'PENDING_VERIFICATION',       -- PDF uploaded; awaiting pharmacist review
    'APPROVED',                   -- Pharmacist approved; fulfillment order created
    'REJECTED',                   -- Pharmacist rejected; doctor + sponsor notified
    'AWAITING_CLARIFICATION',     -- Pharmacist requested clarification from doctor
    'DISPATCHED'                  -- Medication dispatched; courier tracking active
);

-- =============================================================================
-- TABLE: soap_notes
-- =============================================================================

CREATE TABLE soap_notes (
    id                      BIGSERIAL           PRIMARY KEY,

    -- Owning appointment (session boundary)
    appointment_id          BIGINT              NULL
                            REFERENCES appointments(id) ON DELETE SET NULL,

    -- Participants
    patient_id              BIGINT              NOT NULL
                            REFERENCES users(id) ON DELETE RESTRICT,

    doctor_id               BIGINT              NOT NULL
                            REFERENCES users(id) ON DELETE RESTRICT,

    -- SOAP content (FHIR R4 Composition-aligned)
    subjective              TEXT,               -- S: patient-reported symptoms
    objective               TEXT,               -- O: vitals, exam findings, lab results
    assessment              TEXT,               -- A: differential diagnosis
    plan                    TEXT,               -- P: prescriptions, referrals, follow-up

    -- Safety Rail §7: Daily.co session token that authorized this EMR write
    session_token           VARCHAR(500),

    -- Prescription PDF (MVP shortcut — full e-prescribing deferred post-MVP)
    prescription_s3_key     VARCHAR(1000),      -- S3 object key set on PDF upload
    prescription_status     prescription_status NOT NULL DEFAULT 'NONE',
    prescription_uploaded_at TIMESTAMPTZ,       -- set when prescription_s3_key is populated

    -- Audit
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Doctor's note history per patient
CREATE INDEX idx_soap_patient_id        ON soap_notes (patient_id, created_at DESC);

-- Appointment → notes lookup
CREATE INDEX idx_soap_appointment_id    ON soap_notes (appointment_id);

-- Pharmacist pending queue (sorted by prescription_uploaded_at ASC = most urgent)
CREATE INDEX idx_soap_prescription_status ON soap_notes (prescription_status, prescription_uploaded_at)
    WHERE prescription_status = 'PENDING_VERIFICATION';

-- SLA monitor: find PENDING prescriptions older than 4 hours
CREATE INDEX idx_soap_sla_monitor       ON soap_notes (prescription_uploaded_at)
    WHERE prescription_status = 'PENDING_VERIFICATION';

-- =============================================================================
-- AUTO-UPDATE updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_soap_notes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_soap_notes_updated_at
    BEFORE UPDATE ON soap_notes
    FOR EACH ROW EXECUTE FUNCTION update_soap_notes_updated_at();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE  soap_notes                             IS 'SOAP clinical notes. EMR write-access gated by appointment status and session token.';
COMMENT ON COLUMN soap_notes.session_token               IS 'Daily.co session ID authorizing this write. Safety Rail §7.';
COMMENT ON COLUMN soap_notes.prescription_s3_key         IS 'S3 object key for uploaded prescription PDF. NULL until upload.';
COMMENT ON COLUMN soap_notes.prescription_status         IS 'Drives pharmacy verification workflow. NONE until PDF uploaded.';
COMMENT ON COLUMN soap_notes.prescription_uploaded_at    IS 'SLA clock start. 4-hour window before escalation.';
