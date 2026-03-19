-- =============================================================================
-- V5__appointments.sql
-- Project Preventia — Appointments Table
-- Database: PostgreSQL 16
-- Migration Tool: Flyway (managed; never edit after commit to version control)
-- Region: AWS Mumbai (ap-south-1) — PHI data residency per DPDP Act 2023
--
-- Creates the appointments table to persist teleconsultation session records.
-- Linked to the Daily.co video infrastructure (room URL + name for webhook matching).
-- Status drives EMR write-access gating via the Session Lock mechanism.
-- =============================================================================

-- =============================================================================
-- ENUM: appointment_status
-- =============================================================================

CREATE TYPE appointment_status AS ENUM (
    'SCHEDULED',    -- Appointment booked; Daily.co room provisioned
    'ACTIVE',       -- Room is live; Doctor is present; EMR write-access OPEN
    'COMPLETED',    -- Session ended normally; pending EMR lock
    'LOCKED',       -- EMR write-access REVOKED; session archived
    'CANCELLED',    -- Appointment cancelled before session start
    'NO_SHOW'       -- Recipient never joined; EMR locked without clinical note
);

-- =============================================================================
-- TABLE: appointments
-- =============================================================================

CREATE TABLE appointments (
    id                  BIGSERIAL           PRIMARY KEY,

    -- Participant IDs (all FK to users.id)
    recipient_id        BIGINT              NOT NULL
                        REFERENCES users(id) ON DELETE RESTRICT,

    sponsor_id          BIGINT              NULL
                        REFERENCES users(id) ON DELETE SET NULL,  -- nullable: not all sessions have a Sponsor

    doctor_id           BIGINT              NOT NULL
                        REFERENCES users(id) ON DELETE RESTRICT,

    -- Scheduled session window (timezone-aware)
    start_time          TIMESTAMPTZ         NOT NULL,
    end_time            TIMESTAMPTZ         NOT NULL,

    -- Daily.co room reference
    -- daily_room_url:  full HTTPS URL distributed to participants
    -- daily_room_name: short identifier used to match incoming webhook events
    daily_room_url      VARCHAR(500)        NOT NULL,
    daily_room_name     VARCHAR(255)        NOT NULL,

    -- Lifecycle state — drives EMR write-access gating
    status              appointment_status  NOT NULL DEFAULT 'SCHEDULED',

    -- Audit
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_session_window CHECK (end_time > start_time),
    CONSTRAINT uq_daily_room_name UNIQUE (daily_room_name)  -- one appointment per Daily.co room
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Doctor's upcoming session list
CREATE INDEX idx_appt_doctor_id         ON appointments (doctor_id, start_time);

-- Recipient's appointment history
CREATE INDEX idx_appt_recipient_id      ON appointments (recipient_id, start_time);

-- Webhook event matching: Daily.co → appointment lookup by room name
CREATE INDEX idx_appt_daily_room_name   ON appointments (daily_room_name);

-- Status-based queries (e.g., "all ACTIVE sessions" for monitoring)
CREATE INDEX idx_appt_status            ON appointments (status);

-- Scheduled sessions in upcoming time window (scheduling dashboard)
CREATE INDEX idx_appt_start_time        ON appointments (start_time)
    WHERE status = 'SCHEDULED';

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE  appointments                          IS 'Teleconsultation session records. Status drives EMR write-access via Session Lock.';
COMMENT ON COLUMN appointments.recipient_id             IS 'FK → users(id). The patient / Indian elder receiving care.';
COMMENT ON COLUMN appointments.sponsor_id               IS 'FK → users(id). Optional NRI child observer. NULL when no sponsor.';
COMMENT ON COLUMN appointments.doctor_id                IS 'FK → users(id). Attending physician.';
COMMENT ON COLUMN appointments.daily_room_url           IS 'Full Daily.co HTTPS room URL. Shared with participants at appointment time.';
COMMENT ON COLUMN appointments.daily_room_name          IS 'Short Daily.co room identifier. Used to match meeting.ended webhook → EMR lock.';
COMMENT ON COLUMN appointments.status                   IS 'SCHEDULED → ACTIVE → COMPLETED → LOCKED. LOCKED revokes EMR write-access permanently.';
