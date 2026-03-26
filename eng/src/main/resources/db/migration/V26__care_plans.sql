-- V26: Care plans — recurring check-in questions from doctor to patient.

CREATE TABLE care_plans (
    id              BIGSERIAL       PRIMARY KEY,
    patient_id      BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id       BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id  BIGINT          REFERENCES appointments(id) ON DELETE SET NULL,
    question        TEXT            NOT NULL,
    frequency       VARCHAR(20)     NOT NULL DEFAULT 'WEEKLY', -- DAILY | WEEKLY | MONTHLY
    next_send_at    TIMESTAMPTZ     NOT NULL,
    active          BOOLEAN         NOT NULL DEFAULT TRUE,
    missed_count    INT             NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_plans_next_send ON care_plans (next_send_at) WHERE active = TRUE;

CREATE TABLE care_plan_responses (
    id                BIGSERIAL       PRIMARY KEY,
    care_plan_id      BIGINT          NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
    response_text     TEXT,
    stream_message_id VARCHAR(255),
    responded_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_plan_responses_plan ON care_plan_responses (care_plan_id, responded_at DESC);
