-- ============================================================
-- Shared Seed Data — Facilities, Carriers, Reference Data
-- ============================================================

-- Sample facilities (spanning TMS, WMS, and YMS)
INSERT INTO shared.facilities (code, name, type, city, state, timezone) VALUES
  ('SC-DFW1', 'DFW Sort Center', 'SORT_CENTER', 'Dallas', 'TX', 'America/Chicago'),
  ('SC-LAX1', 'LAX Sort Center', 'SORT_CENTER', 'Los Angeles', 'CA', 'America/Los_Angeles'),
  ('XD-ORD1', 'ORD Cross Dock', 'CROSS_DOCK', 'Chicago', 'IL', 'America/Chicago'),
  ('FC-PHX1', 'PHX Fulfillment Center', 'FULFILLMENT_CENTER', 'Phoenix', 'AZ', 'America/Phoenix'),
  ('TL-ATL1', 'ATL Transload', 'TRANSLOAD', 'Atlanta', 'GA', 'America/New_York'),
  ('SP-SEA1', 'SEA Spoke', 'SPOKE', 'Seattle', 'WA', 'America/Los_Angeles'),
  ('BR-MIA1', 'MIA Branch', 'BRANCH', 'Miami', 'FL', 'America/New_York'),
  ('WH-DFW2', 'DFW Warehouse', 'WAREHOUSE', 'Fort Worth', 'TX', 'America/Chicago'),
  ('AFC-ONT8', 'Amazon ONT8', 'AMAZON_FC', 'San Bernardino', 'CA', 'America/Los_Angeles'),
  ('AFC-MDW2', 'Amazon MDW2', 'AMAZON_FC', 'Joliet', 'IL', 'America/Chicago')
ON CONFLICT (code) DO NOTHING;

-- Sample carriers
INSERT INTO shared.carriers (name, scac, mc_number, dot_number, protocol, status) VALUES
  ('XPO Logistics', 'XPOL', 'MC-123456', 'DOT-789012', 'API', 'ACTIVE'),
  ('Werner Enterprises', 'WERN', 'MC-234567', 'DOT-890123', 'EDI', 'ACTIVE'),
  ('JB Hunt Transport', 'JBHT', 'MC-345678', 'DOT-901234', 'API', 'ACTIVE'),
  ('Schneider National', 'SNDR', 'MC-456789', 'DOT-012345', 'EDI', 'ACTIVE'),
  ('Swift Transportation', 'SWFT', 'MC-567890', 'DOT-123456', 'EDI', 'ACTIVE'),
  ('Knight Transportation', 'KNGT', 'MC-678901', 'DOT-234567', 'API', 'ACTIVE'),
  ('Heartland Express', 'HTLD', 'MC-789012', 'DOT-345678', 'EDI', 'ACTIVE'),
  ('Old Dominion Freight', 'ODFL', 'MC-890123', 'DOT-456789', 'EDI', 'ACTIVE')
ON CONFLICT (scac) DO NOTHING;
