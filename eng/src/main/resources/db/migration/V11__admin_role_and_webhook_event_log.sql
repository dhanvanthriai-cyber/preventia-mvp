-- V11: Introduce ADMIN role support and webhook event logging.
--
-- users.role is already VARCHAR(20) since V9, so no column migration is needed.
-- The legacy user_role enum may still exist in older databases; extend it for
-- completeness so bootstrap or manual SQL scripts can still reference ADMIN.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE webhook_event_log (
    id               BIGSERIAL    PRIMARY KEY,
    provider         VARCHAR(50)  NOT NULL,
    endpoint         VARCHAR(120) NOT NULL,
    event_type       VARCHAR(120) NOT NULL,
    reference_id     VARCHAR(255),
    room_name        VARCHAR(255),
    status_code      INT          NOT NULL,
    signature_valid  BOOLEAN,
    payload_summary  TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_event_provider_created
    ON webhook_event_log (provider, created_at DESC);

CREATE INDEX idx_webhook_event_status_created
    ON webhook_event_log (status_code, created_at DESC);

CREATE INDEX idx_webhook_event_created
    ON webhook_event_log (created_at DESC);
