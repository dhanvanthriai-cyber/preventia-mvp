-- ============================================================
-- V2__add_user_abha_nri_fields.sql
-- Project Dhanvanthri · Flyway Migration V2
-- ============================================================
--
-- PURPOSE
-- -------
-- Adds two nullable columns to the `users` table:
--
--   nri_proxy_id (UUID)
--     Supports the Sponsor Proxy Model: when an NRI child (SPONSOR role)
--     funds healthcare for an Indian relative (PATIENT role), this column
--     links the SPONSOR's user record to their proxy identity in the system.
--     The proxy identity enables the Tri-Party consent flow:
--       NRI Sponsor → Proxy → Indian Patient
--     without requiring the NRI to hold an ABHA ID themselves.
--     Only populated for Role = SPONSOR; NULL for all other roles.
--
--   abha_id (VARCHAR 50)
--     Stores the Ayushman Bharat Health Account (ABHA) number or address
--     issued by the National Health Authority (NHA).
--     Used for ABDM FHIR R4 patient linking and Health Information Exchange
--     (HIE) — specifically the Patient/$match operation against the ABDM
--     Health Repository. VARCHAR(50) accommodates both the 14-digit numeric
--     ABHA number and the future ABHA address format (name@abdm).
--     NULL allowed: patients may register before obtaining an ABHA ID.
--
-- ROLLBACK (manual, if needed)
--   ALTER TABLE users DROP COLUMN IF EXISTS nri_proxy_id;
--   ALTER TABLE users DROP COLUMN IF EXISTS abha_id;
--   DROP INDEX IF EXISTS idx_users_abha_id;
--   DROP INDEX IF EXISTS idx_users_nri_proxy_id;
-- ============================================================

ALTER TABLE users ADD COLUMN nri_proxy_id UUID;
ALTER TABLE users ADD COLUMN abha_id VARCHAR(50);

-- Index: abha_id — supports ABDM patient lookup (Patient/$match)
CREATE INDEX idx_users_abha_id ON users (abha_id)
    WHERE abha_id IS NOT NULL;

-- Index: nri_proxy_id — supports proxy identity resolution in Tri-Party flow
CREATE INDEX idx_users_nri_proxy_id ON users (nri_proxy_id)
    WHERE nri_proxy_id IS NOT NULL;
