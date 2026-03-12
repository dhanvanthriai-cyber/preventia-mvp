-- ============================================================
-- Flyway Migration: V3__lab_orders.sql
-- Project: Dhanvanthri Healthcare MVP
-- Owner: @ops / @eng
-- Date: 2026-03-11
-- Description: Creates lab_orders table for diagnostic lab
--              integration with cold chain tracking support.
-- ============================================================

-- Lab partner enum (extend as new partners onboard)
CREATE TYPE lab_partner_code AS ENUM (
    'THYROCARE',
    'LAL_PATHLABS',
    'METROPOLIS',
    'SRL',
    'LOCAL_ICMR',
    'MANUAL'          -- fallback: ops team manually uploaded result
);

-- Lab order status lifecycle
CREATE TYPE lab_order_status AS ENUM (
    'ORDERED',        -- Order placed with lab API
    'COLLECTED',      -- Phlebotomist collected sample (webhook: sample_collected)
    'IN_TRANSIT',     -- Sample in transit to lab (cold chain monitoring active)
    'RESULTED',       -- Results ready, PDF fetched and stored
    'FAILED'          -- Order failed or cold chain breach — requires ops intervention
);

-- Temperature unit (CELSIUS only for MVP; extensible)
CREATE TYPE temp_unit_code AS ENUM (
    'CELSIUS'
);

-- ============================================================
-- Main table: lab_orders
-- ============================================================
CREATE TABLE lab_orders (
    id                  BIGSERIAL PRIMARY KEY,

    -- Relational links
    appointment_id      BIGINT NOT NULL
                            REFERENCES appointments(id)
                            ON DELETE RESTRICT,

    patient_id          BIGINT NOT NULL
                            REFERENCES users(id)
                            ON DELETE RESTRICT,

    -- Lab partner identity
    lab_partner         lab_partner_code NOT NULL DEFAULT 'THYROCARE',

    -- Test identification (LOINC code preferred; proprietary code fallback)
    test_code           VARCHAR(100) NOT NULL,
    test_name           VARCHAR(255),                   -- Human-readable label for display

    -- External lab system references (populated after POST /orders response)
    external_order_id   VARCHAR(255),                   -- Lab's orderId
    tracking_id         VARCHAR(255),                   -- Lab's trackingId for real-time tracking

    -- Order lifecycle
    status              lab_order_status NOT NULL DEFAULT 'ORDERED',
    scheduled_at        TIMESTAMPTZ,                    -- Requested phlebotomy appointment time
    collected_at        TIMESTAMPTZ,                    -- Actual sample collection time (from webhook)
    resulted_at         TIMESTAMPTZ,                    -- When results became available (from webhook)

    -- Cold chain tracking
    requires_cold_chain BOOLEAN NOT NULL DEFAULT FALSE,
    last_temp_reading   NUMERIC(5, 2),                  -- Most recent temperature in °C (2 decimal places)
    temp_unit           temp_unit_code DEFAULT 'CELSIUS',
    temp_logged_at      TIMESTAMPTZ,                    -- Timestamp of last temperature reading
    cold_chain_breached BOOLEAN NOT NULL DEFAULT FALSE, -- Set TRUE if temp exceeded safe range

    -- Result storage
    result_pdf_key      VARCHAR(500),                   -- S3 object key (null until results arrive)
                                                        -- Format: lab-reports/{patientId}/{externalOrderId}.pdf

    -- Collection address snapshot (denormalised for audit; patient may move)
    collection_address  TEXT,                           -- Full address string at time of order

    -- Metadata
    notes               TEXT,                           -- Ops notes, manual fallback comments
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

-- Lookup by appointment (one appointment may have multiple lab orders)
CREATE INDEX idx_lab_orders_appointment_id
    ON lab_orders (appointment_id);

-- Lookup by patient (patient history / dashboard)
CREATE INDEX idx_lab_orders_patient_id
    ON lab_orders (patient_id);

-- Lookup by external ID (webhook matching — fires frequently)
CREATE INDEX idx_lab_orders_external_order_id
    ON lab_orders (external_order_id)
    WHERE external_order_id IS NOT NULL;

-- Lookup by tracking ID (cold chain temp updates)
CREATE INDEX idx_lab_orders_tracking_id
    ON lab_orders (tracking_id)
    WHERE tracking_id IS NOT NULL;

-- Cold chain monitoring query (find active cold chain orders in transit)
CREATE INDEX idx_lab_orders_cold_chain_active
    ON lab_orders (status, requires_cold_chain)
    WHERE requires_cold_chain = TRUE AND status = 'IN_TRANSIT';

-- Status-based queries (ops dashboard, retry jobs)
CREATE INDEX idx_lab_orders_status
    ON lab_orders (status);

-- ============================================================
-- Auto-update trigger for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lab_orders_updated_at
    BEFORE UPDATE ON lab_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Cold chain reference table: tests requiring cold chain
-- ============================================================

CREATE TABLE cold_chain_test_codes (
    test_code           VARCHAR(100) PRIMARY KEY,       -- LOINC code or proprietary
    test_name           VARCHAR(255) NOT NULL,
    max_temp_celsius    NUMERIC(4, 1) NOT NULL DEFAULT 8.0,   -- Max safe temp (°C)
    min_temp_celsius    NUMERIC(4, 1) NOT NULL DEFAULT 2.0,   -- Min safe temp (°C)
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: Common cold-chain required tests
INSERT INTO cold_chain_test_codes (test_code, test_name, max_temp_celsius, min_temp_celsius, notes)
VALUES
    ('20448-7',  'Insulin [Units/volume] in Serum or Plasma',    8.0, 2.0, 'LOINC — Insulin assay'),
    ('2731-8',   'Parathyrin [Mass/volume] in Serum or Plasma',  8.0, 2.0, 'LOINC — PTH assay'),
    ('2141-0',   'Corticotropin [Mass/volume] in Plasma',        8.0, 2.0, 'LOINC — ACTH assay'),
    ('TC-CRYO',  'Cryoglobulin Panel',                           37.0, 37.0,'Transport at 37°C — special handling required'),
    ('TC-PCR',   'PCR Genetic Panel (Thyrocare proprietary)',     8.0, 2.0, 'Cold box with data logger required');

-- ============================================================
-- Comments for documentation
-- ============================================================

COMMENT ON TABLE lab_orders IS
    'Diagnostic lab orders created after telehealth consultations. '
    'Supports cold chain tracking for temperature-sensitive samples. '
    'Primary integration: Thyrocare REST API (MVP). Manual fallback via ops team.';

COMMENT ON COLUMN lab_orders.external_order_id IS
    'Order ID returned by lab partner API (e.g., Thyrocare POST /api/order response). '
    'Used to match inbound webhooks and fetch PDF reports.';

COMMENT ON COLUMN lab_orders.result_pdf_key IS
    'S3 object key for the lab report PDF. Format: lab-reports/{patientId}/{externalOrderId}.pdf. '
    'Null until status=RESULTED. Generate signed URL (7-day expiry) for sponsor access.';

COMMENT ON COLUMN lab_orders.cold_chain_breached IS
    'Set to TRUE if any temperature reading exceeds the safe range defined in cold_chain_test_codes. '
    'Triggers immediate ops alert. Doctor must be notified before report is released to sponsor.';
