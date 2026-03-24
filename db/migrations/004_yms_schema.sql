-- 004_yms_schema.sql
-- YMS (Yard Management System) schema
-- Recreated from existing Supabase schema, adapted for standalone PostgreSQL

CREATE SCHEMA IF NOT EXISTS yms;

-- ============================================================
-- yms.tenants
-- ============================================================
CREATE TABLE yms.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- yms.profiles
-- Note: In Supabase production, this references auth.users(id).
-- For standalone PostgreSQL, we use a UUID PK without the FK constraint.
-- ============================================================
CREATE TABLE yms.profiles (
  id UUID PRIMARY KEY, -- In production Supabase: REFERENCES auth.users(id) ON DELETE CASCADE
  tenant_id UUID NOT NULL REFERENCES yms.tenants(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin','manager','guard','viewer')),
  avatar_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_yms_profiles_tenant ON yms.profiles(tenant_id);
CREATE INDEX idx_yms_profiles_email ON yms.profiles(email);

-- ============================================================
-- yms.dock_doors
-- ============================================================
CREATE TABLE yms.dock_doors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES yms.tenants(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inbound','outbound','both')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available','occupied','maintenance','reserved')),
  current_trailer TEXT,
  current_driver TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, number)
);

CREATE INDEX idx_yms_dock_doors_tenant ON yms.dock_doors(tenant_id);
CREATE INDEX idx_yms_dock_doors_status ON yms.dock_doors(status);

-- ============================================================
-- yms.yard_spots
-- ============================================================
CREATE TABLE yms.yard_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES yms.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone TEXT,
  status TEXT DEFAULT 'empty' CHECK (status IN ('empty','occupied','reserved','maintenance')),
  trailer_id TEXT,
  trailer_type TEXT,
  trucking_company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_yms_yard_spots_tenant ON yms.yard_spots(tenant_id);
CREATE INDEX idx_yms_yard_spots_status ON yms.yard_spots(status);
CREATE INDEX idx_yms_yard_spots_zone ON yms.yard_spots(zone);

-- ============================================================
-- yms.gate_log
-- ============================================================
CREATE TABLE yms.gate_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES yms.tenants(id) ON DELETE CASCADE,
  trailer_id TEXT NOT NULL,
  -- Optional FK to shared.trailers for cross-domain linking
  shared_trailer_id UUID REFERENCES shared.trailers(id),
  trucking_company TEXT,
  driver_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  seal_number TEXT,
  arrival TIMESTAMPTZ DEFAULT NOW(),
  departure TIMESTAMPTZ,
  dock_door TEXT,
  yard_spot TEXT,
  status TEXT DEFAULT 'On Property' CHECK (status IN ('On Property','Docked','In Yard','Departed','Pending')),
  notes TEXT,
  checked_in_by UUID REFERENCES yms.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_yms_gate_log_tenant ON yms.gate_log(tenant_id);
CREATE INDEX idx_yms_gate_log_trailer ON yms.gate_log(trailer_id);
CREATE INDEX idx_yms_gate_log_status ON yms.gate_log(status);
CREATE INDEX idx_yms_gate_log_arrival ON yms.gate_log(arrival DESC);
CREATE INDEX idx_yms_gate_log_direction ON yms.gate_log(direction);
CREATE INDEX idx_yms_gate_log_company ON yms.gate_log(trucking_company);

-- ============================================================
-- yms.message_channels
-- ============================================================
CREATE TABLE yms.message_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES yms.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT DEFAULT 'general' CHECK (channel_type IN ('general','alerts','operations','dispatch')),
  created_by UUID REFERENCES yms.profiles(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_yms_channels_tenant ON yms.message_channels(tenant_id);

-- ============================================================
-- yms.messages
-- ============================================================
CREATE TABLE yms.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES yms.tenants(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES yms.message_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES yms.profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','system','alert','notification')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_yms_messages_tenant ON yms.messages(tenant_id);
CREATE INDEX idx_yms_messages_channel ON yms.messages(channel_id);
CREATE INDEX idx_yms_messages_sender ON yms.messages(sender_id);
CREATE INDEX idx_yms_messages_created ON yms.messages(created_at DESC);

-- ============================================================
-- yms.audit_log
-- ============================================================
CREATE TABLE yms.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES yms.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES yms.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_yms_audit_tenant ON yms.audit_log(tenant_id);
CREATE INDEX idx_yms_audit_user ON yms.audit_log(user_id);
CREATE INDEX idx_yms_audit_entity ON yms.audit_log(entity_type, entity_id);
CREATE INDEX idx_yms_audit_created ON yms.audit_log(created_at DESC);

-- ============================================================
-- yms.subscriptions
-- ============================================================
CREATE TABLE yms.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES yms.tenants(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','starter','professional','enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','past_due','cancelled','trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_yms_subs_tenant ON yms.subscriptions(tenant_id);
CREATE INDEX idx_yms_subs_status ON yms.subscriptions(status);

-- ============================================================
-- Updated_at triggers for YMS tables
-- ============================================================
CREATE TRIGGER trg_yms_tenants_updated BEFORE UPDATE ON yms.tenants FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_yms_profiles_updated BEFORE UPDATE ON yms.profiles FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_yms_dock_doors_updated BEFORE UPDATE ON yms.dock_doors FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_yms_yard_spots_updated BEFORE UPDATE ON yms.yard_spots FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_yms_gate_log_updated BEFORE UPDATE ON yms.gate_log FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_yms_channels_updated BEFORE UPDATE ON yms.message_channels FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_yms_messages_updated BEFORE UPDATE ON yms.messages FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
CREATE TRIGGER trg_yms_subs_updated BEFORE UPDATE ON yms.subscriptions FOR EACH ROW EXECUTE FUNCTION shared.set_updated_at();
