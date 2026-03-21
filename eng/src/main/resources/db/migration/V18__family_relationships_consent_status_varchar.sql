-- =============================================================================
-- V18__family_relationships_consent_status_varchar.sql
-- Project Preventia — Fix Hibernate 6 / PostgreSQL enum type mismatch
-- Database: PostgreSQL 16 | Flyway managed — never edit after commit
--
-- Root cause:
--   V1 created consent_status in family_relationships as a PostgreSQL custom
--   ENUM type (consent_status). Hibernate 6 binds Java @Enumerated(EnumType.STRING)
--   fields as character varying, which PostgreSQL rejects without an explicit cast —
--   producing:
--     "column is of type consent_status but expression is of type character varying"
--
--   This is the same class of bug fixed for family_members in V16.
--   Affects: SPONSOR initiating family links (INSERT), RECIPIENT granting or
--   revoking consent (UPDATE). All three operations throw a 500 at runtime.
--
-- Fix:
--   Convert consent_status to VARCHAR(20). Data integrity is preserved via a
--   CHECK constraint (same permitted values as the original enum type).
--   The partial index on consent_status is recreated against the varchar column.
--   The PostgreSQL enum type is dropped after the column is migrated.
-- =============================================================================

-- Step 1: Drop the partial index that references the enum type in its WHERE clause
--         (PostgreSQL won't allow ALTER COLUMN while a partial index uses it)
DROP INDEX IF EXISTS idx_fr_sponsor_granted;

-- Step 2: Convert consent_status → VARCHAR(20)
ALTER TABLE family_relationships
    ALTER COLUMN consent_status TYPE VARCHAR(20)
    USING consent_status::VARCHAR;

ALTER TABLE family_relationships
    ALTER COLUMN consent_status SET DEFAULT 'PENDING';

ALTER TABLE family_relationships
    ADD CONSTRAINT chk_fr_consent_status
    CHECK (consent_status IN ('PENDING', 'GRANTED', 'REVOKED'));

-- Step 3: Recreate the partial index against the varchar column
CREATE INDEX idx_fr_sponsor_granted
    ON family_relationships (sponsor_id, consent_status)
    WHERE consent_status = 'GRANTED';

-- Step 4: Drop the now-unused PostgreSQL enum type
DROP TYPE IF EXISTS consent_status;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN family_relationships.consent_status IS 'VARCHAR(20) — values: PENDING | GRANTED | REVOKED. Enforced by chk_fr_consent_status.';
