-- V10: Convert appointments.status from appointment_status enum to VARCHAR(20).
--
-- Hibernate's @Enumerated(EnumType.STRING) sends status values as plain varchar parameters.
-- PostgreSQL rejects assigning varchar to a custom ENUM column without an explicit cast.
-- Converting to VARCHAR(20) eliminates the type mismatch — the same fix applied to
-- users.role in V9.
--
-- The partial indexes that reference the appointment_status type must be dropped first,
-- then recreated after the column type change.

DROP INDEX IF EXISTS idx_appt_start_time;
DROP INDEX IF EXISTS idx_appt_status;

ALTER TABLE appointments ALTER COLUMN status TYPE VARCHAR(20) USING status::text;
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'SCHEDULED';

CREATE INDEX idx_appt_status     ON appointments(status);
CREATE INDEX idx_appt_start_time ON appointments(start_time) WHERE status = 'SCHEDULED';
