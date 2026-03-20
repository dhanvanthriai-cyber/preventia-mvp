-- V17: Consent records for teleconsultation gate
-- Tracks per-user, per-appointment consent (GDPR / ABDM compliant)

CREATE TABLE consent_records (
    id                  BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    appointment_id      BIGINT          REFERENCES appointments(id) ON DELETE SET NULL,
    consent_type        VARCHAR(30)     NOT NULL DEFAULT 'TELECONSULT',
    recording_consent   BOOLEAN         NOT NULL DEFAULT FALSE,
    consented_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ip_address          VARCHAR(45),
    user_agent          TEXT
);

CREATE INDEX idx_consent_user_appt ON consent_records (user_id, appointment_id);
