-- =============================================================================
-- V14__prescription_multi_file.sql
-- Project Preventia — Multi-File Prescription Upload Support
-- Database: PostgreSQL 16 | Flyway managed — never edit after commit
-- Region: AWS Mumbai (ap-south-1) — PHI data residency per DPDP Act 2023
--
-- Adds prescription_s3_keys TEXT[] to soap_notes for multi-attachment support.
-- The original prescription_s3_key is retained as the canonical "primary" key
-- for backward compatibility with pharmacist queue queries and audit log joins.
--
-- Upload rules:
--   prescription_s3_key   — set to first file in the batch (primary PDF)
--   prescription_s3_keys  — full ordered array of all uploaded S3 object keys
-- Both columns are populated atomically on upload; never updated independently.
-- =============================================================================

ALTER TABLE soap_notes
    ADD COLUMN prescription_s3_keys TEXT[] DEFAULT '{}';

-- Back-fill existing rows: if a single key exists, wrap it in an array
UPDATE soap_notes
SET prescription_s3_keys = ARRAY[prescription_s3_key]
WHERE prescription_s3_key IS NOT NULL
  AND prescription_s3_key <> '';

-- =============================================================================
-- INDEX: fast lookup for notes with > 1 attachment (ops / audit queries)
-- =============================================================================

CREATE INDEX idx_soap_multi_attachment
    ON soap_notes (id)
    WHERE cardinality(prescription_s3_keys) > 1;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN soap_notes.prescription_s3_keys IS
    'Ordered array of S3 object keys for all uploaded prescription files. '
    'Index 0 mirrors prescription_s3_key (primary). Populated atomically on upload.';
