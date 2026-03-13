-- =============================================================================
-- V2__Appointments_Clinical_Pharmacy.sql
-- Project Dhanvanthri — Medications, Inventory Audit Log
-- Database: PostgreSQL 16
-- Migration Tool: Flyway (managed; never edit after commit to version control)
--
-- NOTE: appointments + appointment_status → V4__appointments.sql
--       soap_notes + prescription_status  → V6__soap_notes_schema.sql
--       This migration creates: shared trigger function, audit_source enum,
--       medications, inventory_audit_log
-- =============================================================================


-- =============================================================================
-- SHARED UTILITY FUNCTION
-- =============================================================================

-- Generic trigger function: auto-updates updated_at on any table that uses it.
-- Used by: medications, payments, and future tables with updated_at columns.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE audit_source AS ENUM (
    'SYSTEM',    -- Automated system action
    'SAHAYAK',   -- Care assistant (physical count)
    'USER'       -- Patient or Sponsor manual update
);



-- =============================================================================
-- MEDICATIONS (Pharmacy Inventory)
-- =============================================================================

CREATE TABLE medications (
    id                  BIGSERIAL       PRIMARY KEY,

    patient_id          BIGINT          NOT NULL
                        REFERENCES users(id) ON DELETE RESTRICT,

    drug_name           VARCHAR(255)    NOT NULL,
    total_quantity      INT             NOT NULL CHECK (total_quantity >= 0),
    daily_dosage        INT             NOT NULL CHECK (daily_dosage > 0),

    -- Price in INR — used by Razorpay refill flow
    unit_price_inr      NUMERIC(10, 2),

    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Patient's full medication list
CREATE INDEX idx_med_patient ON medications (patient_id);
-- Low-stock alert query: patient_id + computed days_remaining <= 7
-- (days_remaining = floor(total_quantity / daily_dosage))
CREATE INDEX idx_med_patient_low_stock ON medications (patient_id)
    WHERE (total_quantity / daily_dosage) <= 7;

COMMENT ON TABLE  medications                       IS 'Active medication inventory per patient.';
COMMENT ON COLUMN medications.total_quantity        IS 'Current stock on hand.';
COMMENT ON COLUMN medications.daily_dosage          IS 'Units consumed per day — used to compute days remaining.';


-- =============================================================================
-- INVENTORY AUDIT LOG
-- =============================================================================

CREATE TABLE inventory_audit_log (
    id                  BIGSERIAL       PRIMARY KEY,

    medication_id       BIGINT          NOT NULL
                        REFERENCES medications(id) ON DELETE RESTRICT,

    quantity_before     INT             NOT NULL,
    quantity_after      INT             NOT NULL,

    source              audit_source    NOT NULL,
    actor_id            BIGINT          NULL
                        REFERENCES users(id) ON DELETE SET NULL,

    note                TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Audit trail for a specific medication (most recent first)
CREATE INDEX idx_audit_medication ON inventory_audit_log (medication_id, created_at DESC);

COMMENT ON TABLE  inventory_audit_log               IS 'Immutable audit trail for all inventory changes (PRD §5).';
COMMENT ON COLUMN inventory_audit_log.source        IS 'Who/what triggered the change: SYSTEM, SAHAYAK, or USER.';
COMMENT ON COLUMN inventory_audit_log.actor_id      IS 'FK → users(id). NULL for SYSTEM-initiated changes.';

