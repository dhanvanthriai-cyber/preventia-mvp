-- V19: urgent_message_alerts — tracks SLA escalations for urgent Stream Chat messages
-- CHAT-005 (SPRINT-08)

CREATE TABLE urgent_message_alerts (
    id              BIGSERIAL   PRIMARY KEY,
    channel_id      VARCHAR(255) NOT NULL,
    message_id      VARCHAR(255) NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alert_sent_at   TIMESTAMPTZ,
    CONSTRAINT uq_urgent_alert UNIQUE (channel_id, message_id)
);

CREATE INDEX idx_urgent_message_channel ON urgent_message_alerts(channel_id);
