-- =============================================================================
-- V15__family_members.sql
-- Project Preventia — Family Member Profiles
-- Database: PostgreSQL 16 | Flyway managed — never edit after commit
-- Region: AWS Mumbai (ap-south-1) — PHI data residency per DPDP Act 2023
--
-- A RECIPIENT user can add dependent family members as sub-profiles.
-- These are managed profiles (not full platform accounts) that the primary
-- account holder owns and can enroll into wellness programs.
--
-- Distinct from family_relationships (Sponsor ↔ Recipient tri-party links).
-- family_members = dependents managed by one RECIPIENT for care enrollment.
-- =============================================================================

CREATE TYPE relationship_type AS ENUM (
    'CHILD',    -- Son or daughter
    'PARENT',   -- Father or mother
    'SPOUSE',   -- Husband or wife
    'OTHER'     -- Sibling, grandparent, etc.
);

CREATE TYPE family_member_care_status AS ENUM (
    'ACTIVE',           -- Profile active, care is ongoing
    'CARE_UPDATED',     -- Recent update to care plan
    'PENDING_LAB',      -- Awaiting lab results — requires attention
    'UP_TO_DATE'        -- No pending actions
);

CREATE TABLE family_members (
    id                  BIGSERIAL                   PRIMARY KEY,

    -- The RECIPIENT user who owns and manages this profile
    owner_user_id       BIGINT                      NOT NULL
                        REFERENCES users(id) ON DELETE CASCADE,

    first_name          VARCHAR(100)                NOT NULL,
    last_name           VARCHAR(100)                NOT NULL,
    date_of_birth       DATE,
    phone               VARCHAR(30),
    email               VARCHAR(320),
    address             TEXT,

    relationship        relationship_type           NOT NULL DEFAULT 'OTHER',

    -- Optional profile photo stored in S3
    photo_s3_key        VARCHAR(1000),

    care_status         family_member_care_status   NOT NULL DEFAULT 'ACTIVE',

    created_at          TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

-- Primary query: all members for a given owner, ordered by creation time
CREATE INDEX idx_fm_owner_user_id ON family_members (owner_user_id, created_at ASC);

-- Auto-update updated_at on every row update
CREATE OR REPLACE FUNCTION update_family_members_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_family_members_updated_at
    BEFORE UPDATE ON family_members
    FOR EACH ROW EXECUTE FUNCTION update_family_members_updated_at();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE  family_members                  IS 'Dependent family member profiles managed by a RECIPIENT user. Not full platform accounts.';
COMMENT ON COLUMN family_members.owner_user_id    IS 'FK → users(id). The RECIPIENT who created and manages this profile.';
COMMENT ON COLUMN family_members.relationship     IS 'Relationship of this member to the primary account holder.';
COMMENT ON COLUMN family_members.photo_s3_key     IS 'S3 object key for the member profile photo. NULL until uploaded.';
COMMENT ON COLUMN family_members.care_status      IS 'At-a-glance care status displayed on the family hub dashboard card.';
