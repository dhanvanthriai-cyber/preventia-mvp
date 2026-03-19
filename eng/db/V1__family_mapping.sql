-- =============================================================================
-- V1__family_mapping.sql
-- Project Preventia — Family Mapping Schema
-- Database: PostgreSQL 16
-- Migration Tool: Flyway (managed, never edit after commit)
-- Region: AWS Mumbai (ap-south-1) — PHI data residency per DPDP Act 2023
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TRI-PARTY VALIDATION MODEL
-- -----------------------------------------------------------------------------
-- Preventia enforces a three-party consent chain before any EMR data can be
-- accessed by a Sponsor (NRI child):
--
--   1. SPONSOR (NRI child) initiates a family link → status = PENDING
--   2. RECIPIENT (Patient in India) explicitly grants consent → status = GRANTED
--      At this point, the Sponsor receives read-only access to the Recipient's
--      clinical records, medication inventory, and consultation history.
--   3. RECIPIENT may revoke consent at any time → status = REVOKED
--      Upon revocation, all Sponsor sessions are immediately invalidated and
--      no further EMR data is accessible. The revocation is permanent in this
--      table (a new row must be created to re-establish the link).
--
-- A DOCTOR may read the relationship to verify authorization before sharing
-- clinical notes during a virtual consultation session.
-- A PHARMACY may verify GRANTED status before accepting a Sponsor-funded order.
--
-- This model satisfies:
--   - ABDM (Ayushman Bharat Digital Mission) consent gateway requirements
--   - DPDP Act 2023 (Digital Personal Data Protection) §6 — purpose limitation
--   - NFR §7 — EMR write-access is token-locked to the virtual session window
-- -----------------------------------------------------------------------------


-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
    'PATIENT',    -- Indian recipient (elderly parent)
    'SPONSOR',    -- NRI child funding care
    'DOCTOR',     -- Licensed physician on the platform
    'PHARMACY'    -- Dispensing pharmacy entity
);

CREATE TYPE consent_status AS ENUM (
    'PENDING',    -- Sponsor sent invite; Recipient has not yet responded
    'GRANTED',    -- Recipient confirmed; Sponsor has read-only EMR access
    'REVOKED'     -- Recipient withdrew consent; access immediately terminated
);


-- =============================================================================
-- USERS
-- =============================================================================

CREATE TABLE users (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    email       VARCHAR(320)    NOT NULL,           -- RFC 5321 max local+domain
    role        user_role       NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Primary lookup: login by email (auth flow)
CREATE INDEX idx_users_email     ON users (email);
-- Role-based batch queries (e.g., list all DOCTORs for assignment)
CREATE INDEX idx_users_role      ON users (role);


-- =============================================================================
-- FAMILY RELATIONSHIPS (Tri-Party Consent Link)
-- =============================================================================

CREATE TABLE family_relationships (
    id              BIGSERIAL       PRIMARY KEY,

    -- The NRI Sponsor who initiated the link
    sponsor_id      BIGINT          NOT NULL
                    REFERENCES users(id) ON DELETE RESTRICT,

    -- The Indian Recipient (Patient) being cared for
    recipient_id    BIGINT          NOT NULL
                    REFERENCES users(id) ON DELETE RESTRICT,

    consent_status  consent_status  NOT NULL DEFAULT 'PENDING',

    -- Populated only when status transitions to GRANTED
    granted_at      TIMESTAMPTZ     NULL,

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- A Sponsor can only have one active link per Recipient
    CONSTRAINT uq_sponsor_recipient UNIQUE (sponsor_id, recipient_id)
);

-- Fast lookup: "show me all Recipients this Sponsor is linked to"
CREATE INDEX idx_fr_sponsor_id        ON family_relationships (sponsor_id);
-- Fast lookup: "show me all Sponsors who have access to this Recipient"
CREATE INDEX idx_fr_recipient_id      ON family_relationships (recipient_id);
-- Filter active (GRANTED) links efficiently
CREATE INDEX idx_fr_consent_status    ON family_relationships (consent_status);
-- Composite: common query pattern — all GRANTED links for a Sponsor
CREATE INDEX idx_fr_sponsor_granted   ON family_relationships (sponsor_id, consent_status)
    WHERE consent_status = 'GRANTED';


-- =============================================================================
-- COMMENTS (pg_description for documentation tooling)
-- =============================================================================

COMMENT ON TABLE  users                              IS 'Core platform users across all roles.';
COMMENT ON COLUMN users.role                         IS 'RBAC role; drives Spring Security authorities.';

COMMENT ON TABLE  family_relationships               IS 'Tri-Party Consent links between Sponsors (NRI) and Recipients (India).';
COMMENT ON COLUMN family_relationships.sponsor_id    IS 'FK → users(id). Must have role = SPONSOR.';
COMMENT ON COLUMN family_relationships.recipient_id  IS 'FK → users(id). Must have role = PATIENT.';
COMMENT ON COLUMN family_relationships.consent_status IS 'Drives EMR access gates. REVOKED is terminal for this row.';
COMMENT ON COLUMN family_relationships.granted_at    IS 'Timestamp of explicit Patient consent. NULL until GRANTED.';
