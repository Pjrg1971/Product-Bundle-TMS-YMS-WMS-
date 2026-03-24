-- ============================================================
-- Radixx — Supabase Schema
-- Multi-tenant SaaS with Row-Level Security
-- Run this in the Supabase SQL Editor to set up your database
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS (one row per subscribing organization/facility)
-- ============================================================
CREATE TABLE tenants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  plan                  TEXT NOT NULL DEFAULT 'starter'
                          CHECK (plan IN ('starter','pro','enterprise')),
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','suspended','cancelled','trial')),
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  max_dock_doors        INT  NOT NULL DEFAULT 10,
  max_yard_spots        INT  NOT NULL DEFAULT 20,
  max_users             INT  NOT NULL DEFAULT 5,
  settings              JSONB NOT NULL DEFAULT '{
    "companyName": "",
    "facilityName": "",
    "address": "",
    "timezone": "US/Central",
    "opStart": "05:00",
    "opEnd": "23:00",
    "zones": "A (Staging), B (Overflow), C (Long-Term)"
  }',
  trial_ends_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users — one per user)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('admin','yard_manager','gate_officer',
                                  'dock_supervisor','forklift_operator','viewer')),
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','invited','suspended')),
  last_active_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCK DOORS
-- ============================================================
CREATE TABLE dock_doors (
  id              TEXT NOT NULL,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number          INT  NOT NULL,
  type            TEXT NOT NULL DEFAULT 'Inbound'
                    CHECK (type IN ('Inbound','Outbound')),
  status          TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','occupied','maintenance')),
  current_trailer TEXT,
  current_driver  TEXT,
  customer        TEXT,
  company         TEXT,
  load_status     TEXT CHECK (load_status IN ('Full','Partial','Empty',NULL)),
  assigned_since  TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);

-- ============================================================
-- YARD SPOTS
-- ============================================================
CREATE TABLE yard_spots (
  id           TEXT NOT NULL,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number       INT  NOT NULL,
  zone         TEXT NOT NULL CHECK (zone IN ('A','B','C')),
  status       TEXT NOT NULL DEFAULT 'empty'
                 CHECK (status IN ('empty','occupied')),
  trailer      TEXT,
  trailer_type TEXT CHECK (trailer_type IN ('Dry Van','Reefer','Flatbed','Tanker','Container',NULL)),
  load_status  TEXT CHECK (load_status IN ('Full','Partial','Empty',NULL)),
  company      TEXT,
  customer     TEXT,
  driver_name  TEXT,
  parked_since TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, tenant_id)
);

-- ============================================================
-- GATE LOG (every truck arrival / departure event)
-- ============================================================
CREATE TABLE gate_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trailer_id        TEXT        NOT NULL,
  trailer_type      TEXT        CHECK (trailer_type IN ('Dry Van','Reefer','Flatbed','Tanker','Container',NULL)),
  truck_number      TEXT,
  driver_name       TEXT        NOT NULL,
  driver_license    TEXT,
  driver_phone      TEXT,
  trucking_company  TEXT        NOT NULL,
  customer          TEXT,
  load_status       TEXT        CHECK (load_status IN ('Full','Partial','Empty',NULL)),
  direction         TEXT        NOT NULL CHECK (direction IN ('Inbound','Outbound')),
  arrival           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  departure         TIMESTAMPTZ,
  seal_number       TEXT,
  po_number         TEXT,
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'On Site'
                      CHECK (status IN ('On Site','Departed')),
  assigned_location TEXT,
  checked_in_by     UUID        REFERENCES profiles(id),
  checked_out_by    UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MESSAGE CHANNELS
-- ============================================================
CREATE TABLE message_channels (
  id        TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  icon      TEXT,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (id, tenant_id)
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id TEXT        NOT NULL,
  sender     TEXT        NOT NULL,
  text       TEXT        NOT NULL,
  incoming   BOOLEAN     NOT NULL DEFAULT TRUE,
  user_id    UUID        REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (immutable record of every significant action)
-- ============================================================
CREATE TABLE audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES profiles(id),
  action      TEXT        NOT NULL,  -- 'gate_checkin', 'gate_checkout', 'door_assign', etc.
  entity_type TEXT,                  -- 'gate_log', 'dock_door', 'yard_spot'
  entity_id   TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS (mirrors Stripe subscription state)
-- ============================================================
CREATE TABLE subscriptions (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID        UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT        UNIQUE,
  stripe_customer_id      TEXT,
  plan                    TEXT        NOT NULL DEFAULT 'starter',
  status                  TEXT        NOT NULL DEFAULT 'active',
  addon_api               BOOLEAN     NOT NULL DEFAULT FALSE,
  addon_ai                BOOLEAN     NOT NULL DEFAULT FALSE,
  addon_analytics         BOOLEAN     NOT NULL DEFAULT FALSE,
  addon_autonomous        BOOLEAN     NOT NULL DEFAULT FALSE,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES (for query performance)
-- ============================================================
CREATE INDEX idx_profiles_tenant       ON profiles(tenant_id);
CREATE INDEX idx_dock_doors_tenant     ON dock_doors(tenant_id);
CREATE INDEX idx_yard_spots_tenant     ON yard_spots(tenant_id);
CREATE INDEX idx_gate_log_tenant       ON gate_log(tenant_id);
CREATE INDEX idx_gate_log_arrival      ON gate_log(tenant_id, arrival DESC);
CREATE INDEX idx_gate_log_status       ON gate_log(tenant_id, status);
CREATE INDEX idx_gate_log_trailer      ON gate_log(tenant_id, trailer_id);
CREATE INDEX idx_messages_channel      ON messages(tenant_id, channel_id, created_at DESC);
CREATE INDEX idx_audit_log_tenant      ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_entity      ON audit_log(tenant_id, entity_type, entity_id);

-- ============================================================
-- UPDATED_AT TRIGGER (auto-update timestamp)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated     BEFORE UPDATE ON tenants     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_dock_doors_updated  BEFORE UPDATE ON dock_doors  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_yard_spots_updated  BEFORE UPDATE ON yard_spots  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_gate_log_updated    BEFORE UPDATE ON gate_log    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- HELPER: get the calling user's tenant_id from their JWT
-- ============================================================
CREATE OR REPLACE FUNCTION my_tenant_id()
RETURNS UUID AS $$
  SELECT ((auth.jwt()->'app_metadata'->>'tenant_id')::UUID);
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- HELPER: get the calling user's role from their JWT
-- ============================================================
CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT AS $$
  SELECT (auth.jwt()->'app_metadata'->>'role')::TEXT;
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- ROW LEVEL SECURITY — enable on every table
-- ============================================================
ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dock_doors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE yard_spots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions    ENABLE ROW LEVEL SECURITY;

-- ---- TENANTS ----
-- Users can only see their own tenant
CREATE POLICY "tenant_select" ON tenants
  FOR SELECT USING (id = my_tenant_id());

-- Only admins can update tenant settings
CREATE POLICY "tenant_update" ON tenants
  FOR UPDATE USING (id = my_tenant_id() AND my_role() = 'admin');

-- ---- PROFILES ----
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (tenant_id = my_tenant_id() AND my_role() IN ('admin'));

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (tenant_id = my_tenant_id() AND my_role() = 'admin');

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (tenant_id = my_tenant_id() AND my_role() = 'admin');

-- ---- DOCK DOORS ----
CREATE POLICY "dock_doors_select" ON dock_doors
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "dock_doors_insert" ON dock_doors
  FOR INSERT WITH CHECK (tenant_id = my_tenant_id()
    AND my_role() IN ('admin','yard_manager','dock_supervisor'));

CREATE POLICY "dock_doors_update" ON dock_doors
  FOR UPDATE USING (tenant_id = my_tenant_id()
    AND my_role() IN ('admin','yard_manager','dock_supervisor'));

-- ---- YARD SPOTS ----
CREATE POLICY "yard_spots_select" ON yard_spots
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "yard_spots_insert" ON yard_spots
  FOR INSERT WITH CHECK (tenant_id = my_tenant_id()
    AND my_role() IN ('admin','yard_manager'));

CREATE POLICY "yard_spots_update" ON yard_spots
  FOR UPDATE USING (tenant_id = my_tenant_id()
    AND my_role() IN ('admin','yard_manager','forklift_operator'));

-- ---- GATE LOG ----
CREATE POLICY "gate_log_select" ON gate_log
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "gate_log_insert" ON gate_log
  FOR INSERT WITH CHECK (tenant_id = my_tenant_id()
    AND my_role() IN ('admin','yard_manager','gate_officer'));

CREATE POLICY "gate_log_update" ON gate_log
  FOR UPDATE USING (tenant_id = my_tenant_id()
    AND my_role() IN ('admin','yard_manager','gate_officer'));

CREATE POLICY "gate_log_delete" ON gate_log
  FOR DELETE USING (tenant_id = my_tenant_id()
    AND my_role() IN ('admin','yard_manager'));

-- ---- MESSAGES ----
CREATE POLICY "msg_channels_select" ON message_channels
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (tenant_id = my_tenant_id());

-- ---- AUDIT LOG (read-only for users, written by service role) ----
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (tenant_id = my_tenant_id() AND my_role() IN ('admin','yard_manager'));

-- ---- SUBSCRIPTIONS ----
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "subscriptions_update" ON subscriptions
  FOR UPDATE USING (tenant_id = my_tenant_id() AND my_role() = 'admin');

-- ============================================================
-- DEFAULT MESSAGE CHANNELS (inserted per tenant at signup)
-- See server/routes/tenants.js for the signup trigger function
-- ============================================================
-- Example:
-- INSERT INTO message_channels VALUES
--   ('tms',         <tenant_id>, 'TMS Integration',  '🔗', 1),
--   ('yard-drivers',<tenant_id>, 'Yard Drivers',      '🚛', 2),
--   ('forklift-ops',<tenant_id>, 'Forklift Ops',      '🏗️', 3),
--   ('dock-ops',    <tenant_id>, 'Dock Operations',   '🚪', 4),
--   ('dispatch',    <tenant_id>, 'Dispatch',          '📡', 5),
--   ('security',    <tenant_id>, 'Security & Gate',   '🔒', 6);
