-- =============================================================================
-- V16__family_members_varchar_enums.sql
-- Project Preventia — Fix Hibernate 6 / PostgreSQL enum type mismatch
-- Database: PostgreSQL 16 | Flyway managed — never edit after commit
--
-- Root cause:
--   V15 created care_status and relationship as PostgreSQL custom ENUM types
--   (family_member_care_status, relationship_type). Hibernate 6 binds Java
--   @Enumerated(EnumType.STRING) fields as character varying, which PostgreSQL
--   rejects without an explicit cast — producing:
--     "column is of type family_member_care_status but expression is of type
--      character varying"
--
-- Fix:
--   Convert both columns to VARCHAR(50). Data integrity is preserved via CHECK
--   constraints (same permitted values as the original enum types).
--   The PostgreSQL enum types are dropped after columns are migrated.
-- =============================================================================

-- Step 1: Convert care_status → VARCHAR(50)
ALTER TABLE family_members
    ALTER COLUMN care_status TYPE VARCHAR(50)
    USING care_status::VARCHAR;

ALTER TABLE family_members
    ALTER COLUMN care_status SET DEFAULT 'ACTIVE';

ALTER TABLE family_members
    ADD CONSTRAINT chk_fm_care_status
    CHECK (care_status IN ('ACTIVE', 'CARE_UPDATED', 'PENDING_LAB', 'UP_TO_DATE'));

-- Step 2: Convert relationship → VARCHAR(50)
ALTER TABLE family_members
    ALTER COLUMN relationship TYPE VARCHAR(50)
    USING relationship::VARCHAR;

ALTER TABLE family_members
    ALTER COLUMN relationship SET DEFAULT 'OTHER';

ALTER TABLE family_members
    ADD CONSTRAINT chk_fm_relationship
    CHECK (relationship IN ('CHILD', 'PARENT', 'SPOUSE', 'OTHER'));

-- Step 3: Drop the now-unused PostgreSQL enum types
DROP TYPE IF EXISTS family_member_care_status;
DROP TYPE IF EXISTS relationship_type;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN family_members.care_status  IS 'VARCHAR(50) — values: ACTIVE | CARE_UPDATED | PENDING_LAB | UP_TO_DATE. Enforced by chk_fm_care_status.';
COMMENT ON COLUMN family_members.relationship IS 'VARCHAR(50) — values: CHILD | PARENT | SPOUSE | OTHER. Enforced by chk_fm_relationship.';
