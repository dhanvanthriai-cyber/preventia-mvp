-- =============================================================================
-- V1__Initial_Schema.sql
-- Project Dhanvanthri — Initial Schema
-- Database: PostgreSQL 16
-- Migration Tool: Flyway (managed; never edit after commit to version control)
-- Region: AWS Mumbai (ap-south-1) — PHI data residency per DPDP Act 2023
--
-- Initial schema — users + family_relationships + ABHA/NRI proxy fields
--
-- Consolidates what was previously V1__family_mapping.sql and
-- V2__add_user_abha_nri_fields.sql into a single, clean baseline.
-- nri_proxy_id and abha_id are included in the CREATE TABLE from the start
-- (no ALTER TABLE needed for fresh installs).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TRI-PARTY VALIDATION MODEL
-- -----------------------------------------------------------------------------
-- Dhanvanthri enforces a three-party consent chain before any EMR data can be
-- accessed by a Sponsor (NRI child):
--
--   1. SPONSOR (NRI child) initiates a family link → status = PENDING
--   2. RECIPIENT (Indian parent) explicitly grants consent → status = GRANTED
--      At this point, the Sponsor receives read-only access to the Recipient's
--      clinical records, medication inventory, and consultation history.
--   3. RECIPIENT may revoke consent at any time → status = REVOKED
--      Upon revocation, all Sponsor sessions are immediately invalidated and
--      no further EMR data is accessible. The revocation is permanent in this
--      table (a new row must be created to re-establish the link).
--
-- A DOCTOR may read the relationship to verify authorization before sharing
-- clinical notes during a virtual consultation session.
-- A PHARMACIST may verify GRANTED status before accepting a Sponsor-funded
-- medication order.
--
-- This model satisfies:
--   - ABDM (Ayushman Bharat Digital Mission) consent gateway requirements
--   - DPDP Act 2023 §6 — purpose limitation
--   - NFR §7 — EMR write-access is token-locked to the virtual session window
-- -----------------------------------------------------------------------------


-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
    'RECIPIENT',    -- Indian parent/elder receiving care
    'SPONSOR',      -- NRI child funding care as a remote proxy
    'DOCTOR',       -- Licensed physician on the platform
    'PHARMACIST'    -- Dispensing pharmacy entity
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
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    email           VARCHAR(320)    NOT NULL,        -- RFC 5321 max local+domain
    password        VARCHAR(255)    NOT NULL,        -- BCrypt hash (never plaintext)
    role            user_role       NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- NRI Proxy Identity link.
    -- Populated only for Role = SPONSOR; links the Sponsor to their proxy
    -- identity, enabling the Tri-Party consent flow:
    --   NRI Sponsor → Proxy → Indian Recipient
    -- NULL for all other roles.
    nri_proxy_id    UUID            NULL,

    -- Ayushman Bharat Health Account (ABHA) ID.
    -- Stores the 14-digit ABHA number or future ABHA address (name@abdm).
    -- Required for ABDM FHIR R4 patient linking and HIE (Patient/$match).
    -- NULL allowed: recipients may register before obtaining an ABHA ID.
    abha_id         VARCHAR(50)     NULL,

    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Primary lookup: login by email (auth flow)
CREATE INDEX idx_users_email         ON users (email);
-- Role-based batch queries (e.g., list all DOCTORs for assignment)
CREATE INDEX idx_users_role          ON users (role);
-- ABDM patient lookup (Patient/$match) — sparse index (non-NULL rows only)
CREATE INDEX idx_users_abha_id       ON users (abha_id)
    WHERE abha_id IS NOT NULL;
-- Proxy identity resolution in Tri-Party consent flow — sparse index
CREATE INDEX idx_users_nri_proxy_id  ON users (nri_proxy_id)
    WHERE nri_proxy_id IS NOT NULL;


-- =============================================================================
-- FAMILY RELATIONSHIPS (Tri-Party Consent Link)
-- =============================================================================

CREATE TABLE family_relationships (
    id              BIGSERIAL       PRIMARY KEY,

    -- The NRI Sponsor who initiated the link
    sponsor_id      BIGINT          NOT NULL
                    REFERENCES users(id) ON DELETE RESTRICT,

    -- The Indian Recipient (Parent/Elder) being cared for
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
-- COMMENTS (pg_description for documentation tooling / pgdoc)
-- =============================================================================

COMMENT ON TABLE  users                               IS 'Core platform users across all roles.';
COMMENT ON COLUMN users.role                          IS 'RBAC role; drives Spring Security authorities.';
COMMENT ON COLUMN users.password                      IS 'BCrypt-hashed password. Never expose in API responses.';
COMMENT ON COLUMN users.nri_proxy_id                  IS 'FK to proxy identity. Set only for SPONSOR role; NULL otherwise.';
COMMENT ON COLUMN users.abha_id                       IS 'ABHA number or address (name@abdm). Required for ABDM FHIR R4 HIE linking.';

COMMENT ON TABLE  family_relationships                IS 'Tri-Party Consent links between Sponsors (NRI) and Recipients (India).';
COMMENT ON COLUMN family_relationships.sponsor_id     IS 'FK → users(id). Must have role = SPONSOR.';
COMMENT ON COLUMN family_relationships.recipient_id   IS 'FK → users(id). Must have role = RECIPIENT.';
COMMENT ON COLUMN family_relationships.consent_status IS 'Drives EMR access gates. REVOKED is terminal for this row.';
COMMENT ON COLUMN family_relationships.granted_at     IS 'Timestamp of explicit Recipient consent. NULL until GRANTED.';
