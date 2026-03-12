-- =============================================================================
-- V7__prescription_audit_log.sql
-- Project Dhanvanthri — Prescription Audit Trail
-- Database: PostgreSQL 16 | Flyway managed — never edit after commit
-- Region: AWS Mumbai (ap-south-1) — PHI data residency per DPDP Act 2023
--
-- Immutable audit log for every action taken on a prescription.
-- Satisfies PRESCRIPTION_WORKFLOW.md §Step 5 and DPDP Act 2023 audit requirements.
-- Rows are INSERT-only — never updated or deleted.
-- =============================================================================

-- =============================================================================
-- ENUM: prescription_action
-- =============================================================================

CREATE TYPE prescription_action AS ENUM (
    'UPLOADED',                   -- Doctor uploaded PDF
    'VIEWED',                     -- Pharmacist opened pre-signed URL
    'APPROVED',                   -- Pharmacist approved prescription
    'REJECTED',                   -- Pharmacist rejected prescription
    'CLARIFICATION_REQUESTED',    -- Pharmacist asked doctor for clarification
    'CLARIFICATION_RECEIVED',     -- Doctor replied in message thread
    'ORDER_CREATED',              -- System: fulfillment order created post-approval
    'DISPATCHED',                 -- Pharmacist: courier dispatched, tracking number set
    'SLA_BREACH_ESCALATED'        -- System: no action taken within 4 hours
);

-- =============================================================================
-- TABLE: prescription_audit_log
-- =============================================================================

CREATE TABLE prescription_audit_log (
    id                  BIGSERIAL           PRIMARY KEY,

    -- The SOAP note / prescription this action belongs to
    soap_note_id        BIGINT              NOT NULL
                        REFERENCES soap_notes(id) ON DELETE RESTRICT,

    -- Actor: NULL for system-generated actions (ORDER_CREATED, SLA_BREACH_ESCALATED)
    actor_id            BIGINT              NULL
                        REFERENCES users(id) ON DELETE SET NULL,

    action              prescription_action NOT NULL,

    -- Human-readable reason (required for REJECTED; optional otherwise)
    reason              TEXT,

    -- Structured metadata (e.g. orderId, trackingNumber, presignedUrlExpiry)
    metadata            JSONB,

    -- Immutable timestamp
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary query pattern: audit trail for one prescription (newest first)
CREATE INDEX idx_audit_soap_note        ON prescription_audit_log (soap_note_id, created_at DESC);

-- Actor history (e.g., "all actions by pharmacist X")
CREATE INDEX idx_audit_actor_id         ON prescription_audit_log (actor_id)
    WHERE actor_id IS NOT NULL;

-- Action-type filter (e.g., "all SLA breaches this week")
CREATE INDEX idx_audit_action           ON prescription_audit_log (action, created_at DESC);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE  prescription_audit_log            IS 'Immutable audit trail for prescription lifecycle. INSERT-only. Satisfies DPDP Act 2023 audit requirements.';
COMMENT ON COLUMN prescription_audit_log.actor_id   IS 'NULL for system actions (ORDER_CREATED, SLA_BREACH_ESCALATED).';
COMMENT ON COLUMN prescription_audit_log.metadata   IS 'Structured context: { orderId, trackingNumber, presignedUrlExpiry, etc. }';
