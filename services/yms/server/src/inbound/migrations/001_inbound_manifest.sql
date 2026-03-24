-- =====================================================================
-- Migration 001: Inbound Manifest & Trailer Arrival
-- =====================================================================
-- This migration creates the tables needed for TMS-driven trailer arrival.
--
-- Tables:
--   trailer_manifest        — Inbound manifest data from TMS/EDI/API
--   trailer_arrival_audit   — Audit trail for every trailer arrival event
--
-- Design notes:
--   - trailer_manifest stores the expected freight for an inbound trailer
--   - trailer_arrival_audit captures who arrived the trailer, when, and how
--   - The receive_method column distinguishes auto-arrival from manual override
--   - Idempotency is enforced at the application layer using arrival audit lookups
--   - RLS policies scope all queries to the tenant_id (multi-tenant isolation)
-- =====================================================================

-- ─── Trailer Manifest ───────────────────────────────────────────────
-- Stores manifest data pulled from TMS, EDI, or API sources.
-- One manifest per trailer per inbound shipment.
CREATE TABLE IF NOT EXISTS trailer_manifest (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trailer_number    VARCHAR(50) NOT NULL,
    truck_id          VARCHAR(50),
    carrier_code      VARCHAR(50),
    shipper_id        VARCHAR(100),
    source            VARCHAR(30) NOT NULL CHECK (source IN (
                        'SHIPPO', 'SHIPIUM', 'SHIPSTATION',
                        'EDI_204', 'EDI_856', 'EDI_214',
                        'API_DIRECT', 'MANUAL_ENTRY'
                      )),
    received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_validated      BOOLEAN NOT NULL DEFAULT FALSE,
    validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    po_numbers        JSONB NOT NULL DEFAULT '[]'::jsonb,
    package_count     INT NOT NULL DEFAULT 0,
    pallet_count      INT NOT NULL DEFAULT 0,
    packages          JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite lookup index: find manifests by trailer identifiers
-- Supports exact match on trailer_number + partial match on truck/carrier/shipper
CREATE INDEX IF NOT EXISTS idx_trailer_manifest_lookup
    ON trailer_manifest (tenant_id, trailer_number, truck_id, carrier_code, shipper_id);

-- Find most recent manifest for a trailer
CREATE INDEX IF NOT EXISTS idx_trailer_manifest_recent
    ON trailer_manifest (tenant_id, trailer_number, received_at DESC);

COMMENT ON TABLE trailer_manifest IS
    'Inbound manifest data from TMS/EDI/API sources. One row per trailer shipment.';

-- ─── Trailer Arrival Audit ──────────────────────────────────────────
-- Immutable audit trail for every trailer arrival event.
-- One row per arrival. Used for idempotency checks and compliance.
CREATE TABLE IF NOT EXISTS trailer_arrival_audit (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trailer_id          VARCHAR(100) NOT NULL,
    manifest_id         UUID REFERENCES trailer_manifest(id),
    receive_method      VARCHAR(50) NOT NULL CHECK (receive_method IN (
                          'TMS_AUTO_ARRIVAL', 'MANUAL_SCAN_OVERRIDE'
                        )),
    source_system       VARCHAR(30) NOT NULL,
    arrived_by_user_id  VARCHAR(100) NOT NULL,
    arrived_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    facility_id         VARCHAR(50) NOT NULL,
    door_id             VARCHAR(50),
    package_count       INT NOT NULL DEFAULT 0,
    pallet_count        INT NOT NULL DEFAULT 0,
    override_reason     VARCHAR(255),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Find latest arrival for a trailer (idempotency check)
CREATE INDEX IF NOT EXISTS idx_trailer_arrival_audit_trailer
    ON trailer_arrival_audit (tenant_id, trailer_id, arrived_at DESC);

-- List arrivals by facility + date range (supervisor dashboard)
CREATE INDEX IF NOT EXISTS idx_trailer_arrival_audit_facility
    ON trailer_arrival_audit (tenant_id, facility_id, arrived_at DESC);

-- Find arrivals by user (audit review)
CREATE INDEX IF NOT EXISTS idx_trailer_arrival_audit_user
    ON trailer_arrival_audit (tenant_id, arrived_by_user_id, arrived_at DESC);

COMMENT ON TABLE trailer_arrival_audit IS
    'Immutable audit trail for trailer arrivals. One row per arrive action.';

-- ─── WMS Receipt Log ────────────────────────────────────────────────
-- Records every package/pallet received into WMS.
-- Populated during TMS_AUTO_ARRIVAL (batch) or MANUAL_SCAN_OVERRIDE (one-by-one).
CREATE TABLE IF NOT EXISTS wms_receipt_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    arrival_id          UUID REFERENCES trailer_arrival_audit(id),
    manifest_id         UUID REFERENCES trailer_manifest(id),
    tracking_id         VARCHAR(100) NOT NULL,
    type                VARCHAR(10) NOT NULL CHECK (type IN ('PARCEL', 'PALLET')),
    status              VARCHAR(30) NOT NULL DEFAULT 'RECEIVED_ON_DOCK' CHECK (status IN (
                          'IN_TRANSIT', 'RECEIVED_ON_DOCK', 'IN_PUTAWAY',
                          'STOWED', 'DAMAGED', 'SHORT'
                        )),
    trailer_number      VARCHAR(50) NOT NULL,
    facility_id         VARCHAR(50) NOT NULL,
    door_id             VARCHAR(50),
    po_number           VARCHAR(100),
    received_by_user_id VARCHAR(100) NOT NULL,
    received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    weight_lbs          NUMERIC(10,2),
    sku_count           INT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency: prevent duplicate receipt of same tracking_id at same facility
CREATE UNIQUE INDEX IF NOT EXISTS idx_wms_receipt_log_idempotent
    ON wms_receipt_log (tenant_id, tracking_id, facility_id);

-- Lookup by trailer
CREATE INDEX IF NOT EXISTS idx_wms_receipt_log_trailer
    ON wms_receipt_log (tenant_id, trailer_number, received_at DESC);

-- Lookup by PO
CREATE INDEX IF NOT EXISTS idx_wms_receipt_log_po
    ON wms_receipt_log (tenant_id, po_number) WHERE po_number IS NOT NULL;

COMMENT ON TABLE wms_receipt_log IS
    'WMS receipt log. One row per received package/pallet.';

-- ─── Row Level Security ─────────────────────────────────────────────
-- All tables are tenant-scoped. RLS ensures isolation.

ALTER TABLE trailer_manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailer_arrival_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_receipt_log ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see/modify data for their own tenant
CREATE POLICY tenant_isolation_manifest ON trailer_manifest
    FOR ALL USING (tenant_id = (
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid
    ));

CREATE POLICY tenant_isolation_arrival_audit ON trailer_arrival_audit
    FOR ALL USING (tenant_id = (
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid
    ));

CREATE POLICY tenant_isolation_wms_receipt ON wms_receipt_log
    FOR ALL USING (tenant_id = (
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid
    ));

-- ─── Updated_at trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trailer_manifest_updated_at
    BEFORE UPDATE ON trailer_manifest
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
