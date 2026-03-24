-- 003_wms_schema.sql
-- WMS (Warehouse Management System) schema
-- Uses SERIAL integer PKs to match existing SQLAlchemy models

CREATE SCHEMA IF NOT EXISTS wms;

-- ============================================================
-- wms.items
-- ============================================================
CREATE TABLE wms.items (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  asin TEXT,
  fnsku TEXT,
  msku TEXT,
  description TEXT,
  length_in NUMERIC(8,2),
  width_in NUMERIC(8,2),
  height_in NUMERIC(8,2),
  weight_lb NUMERIC(8,2),
  is_hazmat BOOLEAN DEFAULT FALSE,
  is_fragile BOOLEAN DEFAULT FALSE,
  is_oversized BOOLEAN DEFAULT FALSE,
  requires_lot_tracking BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wms_items_asin ON wms.items(asin);
CREATE INDEX idx_wms_items_fnsku ON wms.items(fnsku);

-- ============================================================
-- wms.lanes
-- ============================================================
CREATE TABLE wms.lanes (
  id SERIAL PRIMARY KEY,
  origin_facility_code TEXT NOT NULL,
  dest_facility_code TEXT NOT NULL,
  cadence TEXT CHECK (cadence IN ('DAILY','WEEKLY','BI_WEEKLY','MONTHLY','ON_DEMAND')),
  mode TEXT CHECK (mode IN ('SPD','LTL','FTL','PARCEL')),
  spd_to_ltl_pieces INTEGER,
  spd_to_ltl_weight NUMERIC(10,2),
  spd_to_ltl_cube NUMERIC(10,2),
  service_level TEXT CHECK (service_level IN ('STANDARD','EXPEDITED','NEXT_DAY','ECONOMY')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wms_lanes_origin ON wms.lanes(origin_facility_code);
CREATE INDEX idx_wms_lanes_dest ON wms.lanes(dest_facility_code);

-- ============================================================
-- wms.shipment_plans
-- ============================================================
CREATE TABLE wms.shipment_plans (
  id SERIAL PRIMARY KEY,
  lane_id INTEGER REFERENCES wms.lanes(id),
  origin_facility_code TEXT NOT NULL,
  dest_facility_code TEXT NOT NULL,
  mode TEXT CHECK (mode IN ('SPD','LTL','FTL','PARCEL')),
  ship_date DATE,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT','PLANNING','READY','IN_PROGRESS','COMPLETED','CANCELLED'
  )),
  amazon_plan_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wms_shipment_plans_lane ON wms.shipment_plans(lane_id);
CREATE INDEX idx_wms_shipment_plans_status ON wms.shipment_plans(status);
CREATE INDEX idx_wms_shipment_plans_ship_date ON wms.shipment_plans(ship_date);

-- ============================================================
-- wms.shipments
-- ============================================================
CREATE TABLE wms.shipments (
  id SERIAL PRIMARY KEY,
  shipment_plan_id INTEGER REFERENCES wms.shipment_plans(id),
  shipment_number TEXT UNIQUE,
  amazon_shipment_id TEXT,
  ship_to_fc_code TEXT,
  mode TEXT CHECK (mode IN ('SPD','LTL','FTL','PARCEL')),
  status TEXT DEFAULT 'CREATED' CHECK (status IN (
    'CREATED','PACKING','PACKED','LABELED','READY','SHIPPED',
    'IN_TRANSIT','DELIVERED','RECEIVED','CLOSED','CANCELLED'
  )),
  bol_number TEXT,
  pro_number TEXT,
  carrier_name TEXT,
  scac TEXT,
  carton_count INTEGER,
  pallet_count INTEGER,
  piece_count INTEGER,
  gross_weight_lb NUMERIC(12,2),
  cube_ft3 NUMERIC(10,2),
  ready_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wms_shipments_plan ON wms.shipments(shipment_plan_id);
CREATE INDEX idx_wms_shipments_status ON wms.shipments(status);
CREATE INDEX idx_wms_shipments_amazon ON wms.shipments(amazon_shipment_id);
CREATE INDEX idx_wms_shipments_shipped ON wms.shipments(shipped_at);

-- ============================================================
-- wms.shipment_lines
-- ============================================================
CREATE TABLE wms.shipment_lines (
  id SERIAL PRIMARY KEY,
  shipment_plan_id INTEGER REFERENCES wms.shipment_plans(id),
  shipment_id INTEGER REFERENCES wms.shipments(id),
  item_id INTEGER NOT NULL REFERENCES wms.items(id),
  planned_qty INTEGER DEFAULT 0,
  packed_qty INTEGER DEFAULT 0,
  shipped_qty INTEGER DEFAULT 0
);

CREATE INDEX idx_wms_shipment_lines_plan ON wms.shipment_lines(shipment_plan_id);
CREATE INDEX idx_wms_shipment_lines_shipment ON wms.shipment_lines(shipment_id);
CREATE INDEX idx_wms_shipment_lines_item ON wms.shipment_lines(item_id);

-- ============================================================
-- wms.pallets
-- ============================================================
CREATE TABLE wms.pallets (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER REFERENCES wms.shipments(id),
  pallet_number TEXT UNIQUE NOT NULL,
  length_in NUMERIC(8,2),
  width_in NUMERIC(8,2),
  height_in NUMERIC(8,2),
  carton_count INTEGER,
  gross_weight_lb NUMERIC(10,2),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','LABELED','LOADED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wms_pallets_shipment ON wms.pallets(shipment_id);
CREATE INDEX idx_wms_pallets_status ON wms.pallets(status);

-- ============================================================
-- wms.cartons
-- ============================================================
CREATE TABLE wms.cartons (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER REFERENCES wms.shipments(id),
  pallet_id INTEGER REFERENCES wms.pallets(id),
  carton_number TEXT UNIQUE NOT NULL,
  amazon_box_id TEXT,
  tracking_id TEXT,
  length_in NUMERIC(8,2),
  width_in NUMERIC(8,2),
  height_in NUMERIC(8,2),
  weight_lb NUMERIC(8,2),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','LABELED','LOADED','SHIPPED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wms_cartons_shipment ON wms.cartons(shipment_id);
CREATE INDEX idx_wms_cartons_pallet ON wms.cartons(pallet_id);
CREATE INDEX idx_wms_cartons_status ON wms.cartons(status);
CREATE INDEX idx_wms_cartons_tracking ON wms.cartons(tracking_id);

-- ============================================================
-- wms.bills_of_lading
-- ============================================================
CREATE TABLE wms.bills_of_lading (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER UNIQUE NOT NULL REFERENCES wms.shipments(id),
  bol_number TEXT UNIQUE NOT NULL,
  shipper_name TEXT,
  consignee_name TEXT,
  carrier_name TEXT,
  scac TEXT,
  piece_count INTEGER,
  pallet_count INTEGER,
  gross_weight_lb NUMERIC(12,2),
  nmfc_class TEXT,
  pdf_uri TEXT,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- wms.dock_appointments
-- ============================================================
CREATE TABLE wms.dock_appointments (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER UNIQUE REFERENCES wms.shipments(id),
  door_id TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  trailer_number TEXT,
  actual_departure TIMESTAMPTZ,
  carrier_arrival_status TEXT CHECK (carrier_arrival_status IN ('ON_TIME','EARLY','LATE','NO_SHOW')),
  status TEXT DEFAULT 'SCHEDULED' CHECK (status IN (
    'SCHEDULED','CHECKED_IN','LOADING','LOADED','DEPARTED','CANCELLED','NO_SHOW'
  )),
  source TEXT DEFAULT 'DOCK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wms_dock_appt_status ON wms.dock_appointments(status);
CREATE INDEX idx_wms_dock_appt_scheduled ON wms.dock_appointments(scheduled_start);
CREATE INDEX idx_wms_dock_appt_door ON wms.dock_appointments(door_id);

-- ============================================================
-- wms.integration_events
-- ============================================================
CREATE TABLE wms.integration_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','PROCESSED','FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wms_events_type ON wms.integration_events(event_type);
CREATE INDEX idx_wms_events_status ON wms.integration_events(status);
CREATE INDEX idx_wms_events_created ON wms.integration_events(created_at DESC);

-- ============================================================
-- Updated_at triggers for WMS tables
-- ============================================================
CREATE TRIGGER trg_wms_items_updated BEFORE UPDATE ON wms.items FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_wms_lanes_updated BEFORE UPDATE ON wms.lanes FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_wms_shipment_plans_updated BEFORE UPDATE ON wms.shipment_plans FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_wms_shipments_updated BEFORE UPDATE ON wms.shipments FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_wms_pallets_updated BEFORE UPDATE ON wms.pallets FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_wms_cartons_updated BEFORE UPDATE ON wms.cartons FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_wms_bol_updated BEFORE UPDATE ON wms.bills_of_lading FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_wms_dock_appt_updated BEFORE UPDATE ON wms.dock_appointments FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
