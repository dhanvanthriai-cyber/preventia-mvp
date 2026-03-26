-- V23: Lifestyle Insights — doctor-broadcast health tips to all associated patients.
--
-- lifestyle_insights: one row per doctor post.
-- insight_reactions:  patient engagement (like/etc.) — one reaction type per patient per insight.

CREATE TABLE lifestyle_insights (
    id                BIGSERIAL       PRIMARY KEY,
    doctor_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_name       VARCHAR(255),          -- Snapshot of doctor's display name at post time
    category          VARCHAR(50)     NOT NULL DEFAULT 'GENERAL',
    title             VARCHAR(255)    NOT NULL,
    body              TEXT            NOT NULL,
    stream_message_id VARCHAR(255),          -- Stream Chat message ID after successful broadcast
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insights_doctor_created ON lifestyle_insights (doctor_id, created_at DESC);

-- Engagement / reactions (like, helpful, etc.)
-- One reaction per (insight, user, reaction type) — unique constraint prevents duplicates.
CREATE TABLE insight_reactions (
    id          BIGSERIAL   PRIMARY KEY,
    insight_id  BIGINT      NOT NULL REFERENCES lifestyle_insights(id) ON DELETE CASCADE,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction    VARCHAR(20) NOT NULL DEFAULT 'like',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_insight_reaction UNIQUE (insight_id, user_id, reaction)
);

CREATE INDEX idx_reactions_insight ON insight_reactions (insight_id);
