-- 002_tms_schema.sql
-- TMS (Transportation Management System) schema

CREATE SCHEMA IF NOT EXISTS tms;

-- ============================================================
-- tms.shipments
-- ============================================================
CREATE TABLE tms.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT UNIQUE NOT NULL,
  leg_type TEXT CHECK (leg_type IN ('LINEHAUL','LAST_MILE','FIRST_MILE','DRAYAGE','TRANSLOAD')),
  origin_facility_id UUID REFERENCES shared.facilities(id),
  destination_facility_id UUID REFERENCES shared.facilities(id),
  status TEXT DEFAULT 'CREATED' CHECK (status IN (
    'CREATED','PLANNING','TENDERED','ACCEPTED','REJECTED',
    'DISPATCHED','IN_TRANSIT','AT_STOP','DELIVERED','COMPLETED',
    'CANCELLED','EXCEPTION'
  )),
  service_level TEXT CHECK (service_level IN ('STANDARD','EXPEDITED','NEXT_DAY','SAME_DAY','ECONOMY')),
  piece_count INTEGER,
  pallet_count INTEGER,
  weight_lbs NUMERIC(12,2),
  cube_ft NUMERIC(10,2),
  references JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_status ON tms.shipments(status);
CREATE INDEX idx_shipments_origin ON tms.shipments(origin_facility_id);
CREATE INDEX idx_shipments_dest ON tms.shipments(destination_facility_id);
CREATE INDEX idx_shipments_created ON tms.shipments(created_at DESC);

-- ============================================================
-- tms.stops
-- ============================================================
CREATE TABLE tms.stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence INTEGER NOT NULL,
  stop_type TEXT NOT NULL CHECK (stop_type IN ('PICKUP','DELIVERY','CROSS_DOCK','TRANSLOAD')),
  facility_id UUID REFERENCES shared.facilities(id),
  customer_id TEXT,
  planned_start_at TIMESTAMPTZ,
  planned_end_at TIMESTAMPTZ,
  actual_arrive_at TIMESTAMPTZ,
  actual_depart_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stops_facility ON tms.stops(facility_id);

-- ============================================================
-- tms.loads
-- ============================================================
CREATE TABLE tms.loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_number TEXT UNIQUE NOT NULL,
  shipment_ids TEXT[],
  carrier_id UUID REFERENCES shared.carriers(id),
  trailer_id TEXT,
  truck_id TEXT,
  origin_stop_id UUID REFERENCES tms.stops(id),
  destination_stop_id UUID REFERENCES tms.stops(id),
  status TEXT DEFAULT 'PLANNING' CHECK (status IN (
    'PLANNING','TENDERED','ACCEPTED','REJECTED','DISPATCHED',
    'IN_TRANSIT','AT_STOP','DELIVERED','COMPLETED','CANCELLED'
  )),
  planned_departure_at TIMESTAMPTZ,
  planned_arrival_at TIMESTAMPTZ,
  actual_departure_at TIMESTAMPTZ,
  actual_arrival_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loads_status ON tms.loads(status);
CREATE INDEX idx_loads_carrier ON tms.loads(carrier_id);
CREATE INDEX idx_loads_origin_stop ON tms.loads(origin_stop_id);
CREATE INDEX idx_loads_dest_stop ON tms.loads(destination_stop_id);
CREATE INDEX idx_loads_planned_departure ON tms.loads(planned_departure_at);

-- ============================================================
-- tms.trading_partners
-- ============================================================
CREATE TABLE tms.trading_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  partner_code TEXT UNIQUE NOT NULL,
  protocol TEXT CHECK (protocol IN ('EDI','API','EMAIL','PORTAL')),
  enabled BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  carrier_id UUID REFERENCES shared.carriers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trading_partners_carrier ON tms.trading_partners(carrier_id);

-- ============================================================
-- tms.raw_transmissions
-- ============================================================
CREATE TABLE tms.raw_transmissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_partner_id UUID REFERENCES tms.trading_partners(id),
  protocol TEXT CHECK (protocol IN ('EDI','API','EMAIL')),
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  document_type TEXT NOT NULL,
  external_reference TEXT,
  interchange_control_number TEXT,
  group_control_number TEXT,
  transaction_set_control_number TEXT,
  shipment_id TEXT,
  load_id TEXT,
  status TEXT DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','PROCESSING','PROCESSED','FAILED','REJECTED')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  raw_payload TEXT,
  raw_headers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_tx_partner ON tms.raw_transmissions(trading_partner_id);
CREATE INDEX idx_raw_tx_status ON tms.raw_transmissions(status);
CREATE INDEX idx_raw_tx_received ON tms.raw_transmissions(received_at DESC);
CREATE INDEX idx_raw_tx_shipment ON tms.raw_transmissions(shipment_id);
CREATE INDEX idx_raw_tx_load ON tms.raw_transmissions(load_id);

-- ============================================================
-- tms.canonical_tender_messages
-- ============================================================
CREATE TABLE tms.canonical_tender_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transmission_id UUID REFERENCES tms.raw_transmissions(id),
  shipment_number TEXT NOT NULL,
  load_number TEXT,
  scac TEXT,
  action TEXT CHECK (action IN ('TENDER','CANCEL','UPDATE')),
  purpose TEXT,
  equipment_type TEXT,
  origin_name TEXT,
  origin_address TEXT,
  origin_city TEXT,
  origin_state TEXT,
  origin_zip TEXT,
  destination_name TEXT,
  destination_address TEXT,
  destination_city TEXT,
  destination_state TEXT,
  destination_zip TEXT,
  pickup_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  weight_lbs NUMERIC(12,2),
  piece_count INTEGER,
  pallet_count INTEGER,
  cube_ft NUMERIC(10,2),
  special_instructions TEXT,
  references JSONB DEFAULT '{}',
  stops JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tender_msgs_shipment ON tms.canonical_tender_messages(shipment_number);

-- ============================================================
-- tms.canonical_status_messages
-- ============================================================
CREATE TABLE tms.canonical_status_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transmission_id UUID REFERENCES tms.raw_transmissions(id),
  shipment_number TEXT NOT NULL,
  load_number TEXT,
  scac TEXT,
  status_code TEXT NOT NULL,
  status_reason TEXT,
  status_description TEXT,
  location_name TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  event_datetime TIMESTAMPTZ,
  appointment_datetime TIMESTAMPTZ,
  weight_lbs NUMERIC(12,2),
  piece_count INTEGER,
  references JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_msgs_shipment ON tms.canonical_status_messages(shipment_number);
CREATE INDEX idx_status_msgs_event ON tms.canonical_status_messages(event_datetime DESC);

-- ============================================================
-- tms.canonical_invoice_messages
-- ============================================================
CREATE TABLE tms.canonical_invoice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transmission_id UUID REFERENCES tms.raw_transmissions(id),
  invoice_number TEXT NOT NULL,
  shipment_number TEXT,
  load_number TEXT,
  scac TEXT,
  invoice_date DATE,
  total_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  charges JSONB DEFAULT '[]',
  references JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_msgs_shipment ON tms.canonical_invoice_messages(shipment_number);

-- ============================================================
-- tms.tenders
-- ============================================================
CREATE TABLE tms.tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT,
  load_id TEXT,
  carrier_id UUID REFERENCES shared.carriers(id),
  connection_type TEXT CHECK (connection_type IN ('EDI','API','MANUAL')),
  outbound_document_type TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING','TENDERED','ACCEPTED','REJECTED','CANCELLED','EXPIRED'
  )),
  tendered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  external_reference TEXT,
  response_code TEXT,
  response_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenders_shipment ON tms.tenders(shipment_id);
CREATE INDEX idx_tenders_load ON tms.tenders(load_id);
CREATE INDEX idx_tenders_carrier ON tms.tenders(carrier_id);
CREATE INDEX idx_tenders_status ON tms.tenders(status);

-- ============================================================
-- tms.tracking_events
-- ============================================================
CREATE TABLE tms.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT,
  load_id TEXT,
  carrier_id UUID REFERENCES shared.carriers(id),
  event_code TEXT NOT NULL,
  event_description TEXT,
  event_datetime TIMESTAMPTZ NOT NULL,
  reported_datetime TIMESTAMPTZ DEFAULT NOW(),
  location_name TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  location_country TEXT DEFAULT 'US',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  source TEXT CHECK (source IN ('EDI','API','MANUAL','YMS','WMS','GPS')),
  references JSONB DEFAULT '{}',
  -- Generated natural key for deduplication
  natural_key TEXT GENERATED ALWAYS AS (
    COALESCE(shipment_id, '') || ':' || event_code || ':' || event_datetime::TEXT
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_tracking_natural_key ON tms.tracking_events(natural_key);
CREATE INDEX idx_tracking_shipment ON tms.tracking_events(shipment_id);
CREATE INDEX idx_tracking_load ON tms.tracking_events(load_id);
CREATE INDEX idx_tracking_carrier ON tms.tracking_events(carrier_id);
CREATE INDEX idx_tracking_event_dt ON tms.tracking_events(event_datetime DESC);

-- ============================================================
-- tms.milestones
-- ============================================================
CREATE TABLE tms.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT,
  load_id TEXT,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
    'PICKUP_SCHEDULED','PICKUP_ARRIVED','PICKUP_DEPARTED',
    'IN_TRANSIT','DELIVERY_SCHEDULED','DELIVERY_ARRIVED',
    'DELIVERY_COMPLETED','POD_RECEIVED','INVOICED'
  )),
  planned_at TIMESTAMPTZ,
  actual_at TIMESTAMPTZ,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_shipment ON tms.milestones(shipment_id);
CREATE INDEX idx_milestones_load ON tms.milestones(load_id);
CREATE INDEX idx_milestones_type ON tms.milestones(milestone_type);

-- ============================================================
-- tms.exception_cases
-- ============================================================
CREATE TABLE tms.exception_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT,
  load_id TEXT,
  exception_type TEXT NOT NULL CHECK (exception_type IN (
    'LATE_PICKUP','LATE_DELIVERY','DAMAGE','SHORTAGE','OVERAGE',
    'REFUSED','OS_AND_D','DETENTION','REWEIGH','REROUTE','OTHER'
  )),
  severity TEXT DEFAULT 'MEDIUM' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','CLOSED')),
  description TEXT,
  resolution TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exceptions_shipment ON tms.exception_cases(shipment_id);
CREATE INDEX idx_exceptions_status ON tms.exception_cases(status);
CREATE INDEX idx_exceptions_type ON tms.exception_cases(exception_type);

-- ============================================================
-- tms.invoices
-- ============================================================
CREATE TABLE tms.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  shipment_id TEXT,
  load_id TEXT,
  carrier_id UUID REFERENCES shared.carriers(id),
  invoice_date DATE NOT NULL,
  due_date DATE,
  total_amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING','UNDER_REVIEW','APPROVED','DISPUTED','PAID','VOID'
  )),
  references JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_shipment ON tms.invoices(shipment_id);
CREATE INDEX idx_invoices_carrier ON tms.invoices(carrier_id);
CREATE INDEX idx_invoices_status ON tms.invoices(status);
CREATE INDEX idx_invoices_date ON tms.invoices(invoice_date DESC);

-- ============================================================
-- tms.invoice_charges
-- ============================================================
CREATE TABLE tms.invoice_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES tms.invoices(id) ON DELETE CASCADE,
  charge_type TEXT NOT NULL,
  charge_code TEXT,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  quantity NUMERIC(10,2),
  rate NUMERIC(12,4),
  rate_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_charges_invoice ON tms.invoice_charges(invoice_id);

-- ============================================================
-- Lane management tables
-- ============================================================

-- tms.locations
CREATE TABLE tms.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  facility_id UUID REFERENCES shared.facilities(id),
  location_type TEXT CHECK (location_type IN ('ORIGIN','DESTINATION','BOTH','CROSS_DOCK','HUB')),
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_facility ON tms.locations(facility_id);

-- tms.lane_master
CREATE TABLE tms.lane_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_code TEXT UNIQUE NOT NULL,
  origin_location_id UUID NOT NULL REFERENCES tms.locations(id),
  destination_location_id UUID NOT NULL REFERENCES tms.locations(id),
  distance_miles NUMERIC(10,2),
  transit_days INTEGER,
  mode TEXT CHECK (mode IN ('TL','LTL','PARCEL','INTERMODAL','DRAYAGE','AIR')),
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lane_master_origin ON tms.lane_master(origin_location_id);
CREATE INDEX idx_lane_master_dest ON tms.lane_master(destination_location_id);

-- tms.lane_schedules
CREATE TABLE tms.lane_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID NOT NULL REFERENCES tms.lane_master(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  cutoff_time TIME,
  departure_time TIME,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lane_schedules_lane ON tms.lane_schedules(lane_id);

-- tms.lane_timings
CREATE TABLE tms.lane_timings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID NOT NULL REFERENCES tms.lane_master(id) ON DELETE CASCADE,
  timing_type TEXT NOT NULL CHECK (timing_type IN ('PICKUP','TRANSIT','DELIVERY','DWELL')),
  min_hours NUMERIC(6,2),
  max_hours NUMERIC(6,2),
  avg_hours NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lane_timings_lane ON tms.lane_timings(lane_id);

-- tms.lane_carriers
CREATE TABLE tms.lane_carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID NOT NULL REFERENCES tms.lane_master(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES shared.carriers(id),
  priority INTEGER DEFAULT 1,
  allocation_pct NUMERIC(5,2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lane_carriers_lane ON tms.lane_carriers(lane_id);
CREATE INDEX idx_lane_carriers_carrier ON tms.lane_carriers(carrier_id);

-- tms.lane_carrier_assignments
CREATE TABLE tms.lane_carrier_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_carrier_id UUID NOT NULL REFERENCES tms.lane_carriers(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  contract_reference TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lane_carrier_asgn_lc ON tms.lane_carrier_assignments(lane_carrier_id);

-- tms.lane_rates
CREATE TABLE tms.lane_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID NOT NULL REFERENCES tms.lane_master(id) ON DELETE CASCADE,
  carrier_id UUID REFERENCES shared.carriers(id),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('FLAT','PER_MILE','PER_CWT','PER_PALLET','PER_PIECE')),
  amount NUMERIC(12,4) NOT NULL,
  currency TEXT DEFAULT 'USD',
  min_charge NUMERIC(12,2),
  effective_date DATE NOT NULL,
  expiry_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lane_rates_lane ON tms.lane_rates(lane_id);
CREATE INDEX idx_lane_rates_carrier ON tms.lane_rates(carrier_id);

-- tms.lane_slas
CREATE TABLE tms.lane_slas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID NOT NULL REFERENCES tms.lane_master(id) ON DELETE CASCADE,
  sla_type TEXT NOT NULL CHECK (sla_type IN ('ON_TIME_PICKUP','ON_TIME_DELIVERY','TRANSIT_TIME','CLAIM_RATE','TENDER_ACCEPT')),
  target_value NUMERIC(10,2) NOT NULL,
  unit TEXT,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lane_slas_lane ON tms.lane_slas(lane_id);

-- tms.reference_configs
CREATE TABLE tms.reference_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type TEXT NOT NULL,
  label TEXT NOT NULL,
  required BOOLEAN DEFAULT FALSE,
  validation_pattern TEXT,
  applies_to TEXT CHECK (applies_to IN ('SHIPMENT','LOAD','STOP','INVOICE')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Asset tracking tables
-- ============================================================

-- tms.live_assets
CREATE TABLE tms.live_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('TRUCK','TRAILER','DRIVER','CONTAINER')),
  asset_identifier TEXT UNIQUE NOT NULL,
  carrier_id UUID REFERENCES shared.carriers(id),
  current_status TEXT DEFAULT 'UNKNOWN' CHECK (current_status IN (
    'UNKNOWN','IDLE','EN_ROUTE','AT_FACILITY','LOADING','UNLOADING','MAINTENANCE'
  )),
  last_known_latitude NUMERIC(10,7),
  last_known_longitude NUMERIC(10,7),
  last_ping_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_live_assets_carrier ON tms.live_assets(carrier_id);
CREATE INDEX idx_live_assets_status ON tms.live_assets(current_status);

-- tms.live_asset_positions
CREATE TABLE tms.live_asset_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES tms.live_assets(id),
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  speed_mph NUMERIC(6,2),
  heading NUMERIC(5,2),
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_positions_asset ON tms.live_asset_positions(asset_id, recorded_at DESC);

-- tms.geofences
CREATE TABLE tms.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  facility_id UUID REFERENCES shared.facilities(id),
  geofence_type TEXT CHECK (geofence_type IN ('CIRCLE','POLYGON')),
  center_latitude NUMERIC(10,7),
  center_longitude NUMERIC(10,7),
  radius_miles NUMERIC(8,2),
  polygon JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geofences_facility ON tms.geofences(facility_id);

-- tms.geofence_events
CREATE TABLE tms.geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID NOT NULL REFERENCES tms.geofences(id),
  asset_id UUID NOT NULL REFERENCES tms.live_assets(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('ENTER','EXIT','DWELL')),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  occurred_at TIMESTAMPTZ NOT NULL,
  dwell_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geofence_events_geofence ON tms.geofence_events(geofence_id);
CREATE INDEX idx_geofence_events_asset ON tms.geofence_events(asset_id);
CREATE INDEX idx_geofence_events_occurred ON tms.geofence_events(occurred_at DESC);

-- ============================================================
-- Updated_at triggers for TMS tables
-- ============================================================
CREATE TRIGGER trg_tms_shipments_updated BEFORE UPDATE ON tms.shipments FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_stops_updated BEFORE UPDATE ON tms.stops FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_loads_updated BEFORE UPDATE ON tms.loads FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_trading_partners_updated BEFORE UPDATE ON tms.trading_partners FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_raw_transmissions_updated BEFORE UPDATE ON tms.raw_transmissions FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_tenders_updated BEFORE UPDATE ON tms.tenders FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_milestones_updated BEFORE UPDATE ON tms.milestones FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_exceptions_updated BEFORE UPDATE ON tms.exception_cases FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_invoices_updated BEFORE UPDATE ON tms.invoices FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_locations_updated BEFORE UPDATE ON tms.locations FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_lane_master_updated BEFORE UPDATE ON tms.lane_master FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_lane_schedules_updated BEFORE UPDATE ON tms.lane_schedules FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_lane_timings_updated BEFORE UPDATE ON tms.lane_timings FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_lane_carriers_updated BEFORE UPDATE ON tms.lane_carriers FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_lane_carrier_asgn_updated BEFORE UPDATE ON tms.lane_carrier_assignments FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_lane_rates_updated BEFORE UPDATE ON tms.lane_rates FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_lane_slas_updated BEFORE UPDATE ON tms.lane_slas FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_reference_configs_updated BEFORE UPDATE ON tms.reference_configs FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_live_assets_updated BEFORE UPDATE ON tms.live_assets FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_tms_geofences_updated BEFORE UPDATE ON tms.geofences FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
