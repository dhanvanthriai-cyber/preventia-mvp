-- V25: Appointment transcripts — stores Daily.co cloud recording URLs and transcript text.
-- Recording is enabled only when consent_records.recording_consent = true.

CREATE TABLE appointment_transcripts (
    id              BIGSERIAL   PRIMARY KEY,
    appointment_id  BIGINT      NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
    recording_url   TEXT,
    transcript_text TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcripts_appointment ON appointment_transcripts (appointment_id);
