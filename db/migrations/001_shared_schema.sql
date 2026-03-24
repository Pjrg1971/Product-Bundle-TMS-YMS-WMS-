-- 001_shared_schema.sql
-- Shared schema: cross-domain tables used by TMS, WMS, and YMS

CREATE SCHEMA IF NOT EXISTS shared;

-- ============================================================
-- shared.facilities
-- ============================================================
CREATE TABLE shared.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('SORT_CENTER','CROSS_DOCK','FULFILLMENT_CENTER','TRANSLOAD','SPOKE','BRANCH','AMAZON_FC','WAREHOUSE')),
  acts_as_last_mile_spoke BOOLEAN DEFAULT FALSE,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  timezone TEXT DEFAULT 'America/Chicago',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- shared.carriers
-- Unifies TMS trading_partners, WMS carrier info, YMS trucking companies
-- ============================================================
CREATE TABLE shared.carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scac TEXT UNIQUE,
  mc_number TEXT,
  dot_number TEXT,
  protocol TEXT CHECK (protocol IN ('EDI','API')),
  insurance_expiry DATE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- shared.trailers
-- Cross-domain trailer tracking
-- ============================================================
CREATE TABLE shared.trailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailer_number TEXT UNIQUE NOT NULL,
  trailer_type TEXT CHECK (trailer_type IN ('Dry Van','Reefer','Flatbed','Tanker','Container')),
  carrier_id UUID REFERENCES shared.carriers(id),
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','IN_TRANSIT','AT_YARD','DOCKED','MAINTENANCE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- shared.shipment_xref
-- Cross-references linking IDs across TMS/WMS/YMS
-- ============================================================
CREATE TABLE shared.shipment_xref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tms_shipment_id TEXT,
  tms_load_id TEXT,
  wms_shipment_id INTEGER,
  wms_shipment_plan_id INTEGER,
  yms_gate_log_id UUID,
  yms_dock_door_id TEXT,
  trailer_id UUID REFERENCES shared.trailers(id),
  carrier_id UUID REFERENCES shared.carriers(id),
  facility_id UUID REFERENCES shared.facilities(id),
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xref_tms_shipment ON shared.shipment_xref(tms_shipment_id);
CREATE INDEX idx_xref_wms_shipment ON shared.shipment_xref(wms_shipment_id);
CREATE INDEX idx_xref_yms_gate ON shared.shipment_xref(yms_gate_log_id);
CREATE INDEX idx_xref_trailer ON shared.shipment_xref(trailer_id);
CREATE INDEX idx_xref_carrier ON shared.shipment_xref(carrier_id);
CREATE INDEX idx_xref_facility ON shared.shipment_xref(facility_id);

-- ============================================================
-- shared.integration_events
-- Event log for cross-system events (LISTEN/NOTIFY backing store)
-- ============================================================
CREATE TABLE shared.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system IN ('TMS','WMS','YMS','GATEWAY')),
  payload JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_by JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_type ON shared.integration_events(event_type, published_at DESC);
CREATE INDEX idx_events_source ON shared.integration_events(source_system, published_at DESC);

-- ============================================================
-- Updated_at trigger function (shared across all schemas)
-- ============================================================
CREATE OR REPLACE FUNCTION shared.set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_facilities_updated
  BEFORE UPDATE ON shared.facilities
  FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

CREATE TRIGGER trg_carriers_updated
  BEFORE UPDATE ON shared.carriers
  FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

CREATE TRIGGER trg_trailers_updated
  BEFORE UPDATE ON shared.trailers
  FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();

CREATE TRIGGER trg_xref_updated
  BEFORE UPDATE ON shared.shipment_xref
  FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
