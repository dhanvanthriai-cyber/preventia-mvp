-- V28: Doctor profile fields — hourly rate (INR) and availability toggle.
-- These are displayed on the doctor dashboard and used for appointment booking.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS hourly_rate_inr  INT     DEFAULT 2500,
    ADD COLUMN IF NOT EXISTS accepting_patients BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN users.hourly_rate_inr     IS 'Doctor fee per consultation in INR. Null for non-doctor roles.';
COMMENT ON COLUMN users.accepting_patients  IS 'Whether the doctor is currently accepting new appointments.';
