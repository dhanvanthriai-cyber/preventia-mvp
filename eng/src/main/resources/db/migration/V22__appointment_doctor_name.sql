-- =============================================================================
-- V22__appointment_doctor_name.sql
-- Project Preventia — Denormalized name snapshots on appointments
-- Adds doctor_name and recipient_name as VARCHAR columns (nullable).
-- Populated at booking time; immutable thereafter (historical accuracy).
-- Also backfills existing rows via a JOIN on users.
-- =============================================================================

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS doctor_name    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

-- Backfill existing rows from users table
UPDATE appointments a
SET
    doctor_name    = u_doc.name,
    recipient_name = u_rec.name
FROM users u_doc, users u_rec
WHERE u_doc.id = a.doctor_id
  AND u_rec.id = a.recipient_id;

COMMENT ON COLUMN appointments.doctor_name    IS 'Snapshot of doctor display name at booking time. Denormalized for history accuracy.';
COMMENT ON COLUMN appointments.recipient_name IS 'Snapshot of patient display name at booking time. Denormalized for history accuracy.';
