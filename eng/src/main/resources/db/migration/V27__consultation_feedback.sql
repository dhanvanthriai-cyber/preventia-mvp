-- V27: Post-consultation satisfaction survey responses.

CREATE TABLE consultation_feedback (
    id              BIGSERIAL   PRIMARY KEY,
    appointment_id  BIGINT      NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating          INT         CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_feedback_appt_user UNIQUE (appointment_id, user_id)
);

CREATE INDEX idx_feedback_appointment ON consultation_feedback (appointment_id);
CREATE INDEX idx_feedback_submitted ON consultation_feedback (submitted_at DESC);
