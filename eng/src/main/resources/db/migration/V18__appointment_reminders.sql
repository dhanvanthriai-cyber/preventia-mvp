-- V18: appointment_reminders — deduplication table for pre-consultation reminder messages
-- CHAT-003 (SPRINT-08)

CREATE TABLE appointment_reminders (
    id              BIGSERIAL   PRIMARY KEY,
    appointment_id  BIGINT      NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    reminder_type   VARCHAR(10) NOT NULL,  -- '24H' | '1H'
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_appt_reminder UNIQUE (appointment_id, reminder_type)
);

CREATE INDEX idx_appt_reminders_appointment_id ON appointment_reminders(appointment_id);
