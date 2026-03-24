-- 005_event_functions.sql
-- NOTIFY/LISTEN helper functions and cross-system event triggers

-- ============================================================
-- Helper function to publish cross-system events
-- ============================================================
CREATE OR REPLACE FUNCTION shared.publish_event(
  p_event_type TEXT,
  p_source TEXT,
  p_payload JSONB
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO shared.integration_events (event_type, source_system, payload)
  VALUES (p_event_type, p_source, p_payload)
  RETURNING id INTO v_id;

  PERFORM pg_notify('integration_events', json_build_object(
    'id', v_id,
    'event_type', p_event_type,
    'source', p_source,
    'payload', p_payload
  )::TEXT);

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TMS: Shipment tendered trigger
-- Fires when a TMS shipment status changes to TENDERED
-- ============================================================
CREATE OR REPLACE FUNCTION tms.notify_shipment_tendered() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'TENDERED' AND (OLD.status IS NULL OR OLD.status <> 'TENDERED') THEN
    PERFORM shared.publish_event('shipment.tendered', 'TMS', json_build_object(
      'shipment_id', NEW.id,
      'shipment_number', NEW.shipment_number,
      'carrier_id', (
        SELECT carrier_id FROM tms.tenders
        WHERE shipment_id = NEW.id::TEXT
        ORDER BY tendered_at DESC LIMIT 1
      )
    )::JSONB);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tms_shipment_tendered
  AFTER UPDATE ON tms.shipments
  FOR EACH ROW EXECUTE FUNCTION tms.notify_shipment_tendered();

-- ============================================================
-- YMS: Trailer arrived trigger
-- Fires on new gate_log entry to notify TMS of trailer arrival
-- ============================================================
CREATE OR REPLACE FUNCTION yms.notify_trailer_arrived() RETURNS TRIGGER AS $$
BEGIN
  PERFORM shared.publish_event('trailer.arrived', 'YMS', json_build_object(
    'gate_log_id', NEW.id,
    'trailer_id', NEW.trailer_id,
    'direction', NEW.direction,
    'trucking_company', NEW.trucking_company,
    'arrival', NEW.arrival
  )::JSONB);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_yms_trailer_arrived
  AFTER INSERT ON yms.gate_log
  FOR EACH ROW EXECUTE FUNCTION yms.notify_trailer_arrived();

-- ============================================================
-- YMS: Dock assigned trigger
-- Fires when a dock door becomes occupied, notifies WMS
-- ============================================================
CREATE OR REPLACE FUNCTION yms.notify_dock_assigned() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'occupied' AND (OLD.status IS NULL OR OLD.status <> 'occupied') THEN
    PERFORM shared.publish_event('dock.assigned', 'YMS', json_build_object(
      'dock_door_id', NEW.id,
      'door_number', NEW.number,
      'type', NEW.type,
      'trailer', NEW.current_trailer,
      'driver', NEW.current_driver,
      'company', NEW.company
    )::JSONB);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_yms_dock_assigned
  AFTER UPDATE ON yms.dock_doors
  FOR EACH ROW EXECUTE FUNCTION yms.notify_dock_assigned();

-- ============================================================
-- WMS: Shipment packed trigger
-- Fires when a WMS shipment status changes to PACKED
-- ============================================================
CREATE OR REPLACE FUNCTION wms.notify_shipment_packed() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PACKED' AND (OLD.status IS NULL OR OLD.status <> 'PACKED') THEN
    PERFORM shared.publish_event('shipment.packed', 'WMS', json_build_object(
      'wms_shipment_id', NEW.id,
      'shipment_number', NEW.shipment_number,
      'carton_count', NEW.carton_count,
      'pallet_count', NEW.pallet_count,
      'gross_weight_lb', NEW.gross_weight_lb
    )::JSONB);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wms_shipment_packed
  AFTER UPDATE ON wms.shipments
  FOR EACH ROW EXECUTE FUNCTION wms.notify_shipment_packed();

-- ============================================================
-- YMS: Trailer departed trigger
-- Fires when gate_log status changes to Departed
-- ============================================================
CREATE OR REPLACE FUNCTION yms.notify_trailer_departed() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Departed' AND (OLD.status IS NULL OR OLD.status <> 'Departed') THEN
    PERFORM shared.publish_event('trailer.departed', 'YMS', json_build_object(
      'gate_log_id', NEW.id,
      'trailer_id', NEW.trailer_id,
      'departure', NEW.departure,
      'direction', NEW.direction
    )::JSONB);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_yms_trailer_departed
  AFTER UPDATE ON yms.gate_log
  FOR EACH ROW EXECUTE FUNCTION yms.notify_trailer_departed();
