-- ============================================================
-- V4: Payments Table
-- Project Dhanvanthri — Multi-currency payment support
-- Dual gateway: Stripe (USD/NRI sponsors) + Razorpay (INR/India)
-- ============================================================

CREATE TYPE payment_gateway AS ENUM ('STRIPE', 'RAZORPAY');
CREATE TYPE payment_status AS ENUM ('PENDING', 'CAPTURED', 'FAILED', 'REFUNDED');
CREATE TYPE payment_type AS ENUM ('CONSULTATION', 'MEDICATION', 'LAB_ORDER');

CREATE TABLE payments (
    id                      BIGSERIAL PRIMARY KEY,
    appointment_id          BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
    payer_id                BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount_cents            BIGINT NOT NULL CHECK (amount_cents > 0),
    currency                VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'INR')),
    gateway                 payment_gateway NOT NULL,
    gateway_payment_id      VARCHAR(255),
    gateway_order_id        VARCHAR(255),
    status                  payment_status NOT NULL DEFAULT 'PENDING',
    payment_type            payment_type NOT NULL,
    exchange_rate_at_capture NUMERIC(10,4),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_appointment_id ON payments(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX idx_payments_gateway_payment_id ON payments(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Refund Policy (enforced at application layer):
-- Cancellation >24h before: 100% refund
-- Cancellation <24h before: 50% refund
-- No-show (patient): no refund
-- No-show (doctor): 100% refund + platform credit
-- ============================================================
