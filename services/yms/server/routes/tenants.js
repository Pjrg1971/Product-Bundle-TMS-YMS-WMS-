/**
 * Tenants Route — handles tenant signup, settings, and yard initialization
 */
const router  = require('express').Router();
const { requireAuth, requireRole, getUserClient, writeAudit, supabaseAdmin } = require('../middleware/auth');

// Default channels seeded for every new tenant
const DEFAULT_CHANNELS = [
  { id: 'tms',          name: 'TMS Integration',  icon: '🔗', sort_order: 1 },
  { id: 'yard-drivers', name: 'Yard Drivers',      icon: '🚛', sort_order: 2 },
  { id: 'forklift-ops', name: 'Forklift Ops',      icon: '🏗️', sort_order: 3 },
  { id: 'dock-ops',     name: 'Dock Operations',   icon: '🚪', sort_order: 4 },
  { id: 'dispatch',     name: 'Dispatch',           icon: '📡', sort_order: 5 },
  { id: 'security',     name: 'Security & Gate',    icon: '🔒', sort_order: 6 },
];

// Default yard layout seeded for every new tenant (Starter plan defaults)
function buildDefaultYard(tenantId) {
  const doors = [];
  for (let i = 1; i <= 5; i++) {
    doors.push({ id: `door-in-${i}`,  tenant_id: tenantId, number: i,    type: 'Inbound',  status: 'available' });
  }
  for (let i = 1; i <= 5; i++) {
    doors.push({ id: `door-out-${i}`, tenant_id: tenantId, number: i + 5, type: 'Outbound', status: 'available' });
  }

  const spots = [];
  const zones = ['A', 'B', 'C'];
  zones.forEach(zone => {
    for (let i = 1; i <= 7; i++) {
      spots.push({ id: `spot-${zone.toLowerCase()}-${i}`, tenant_id: tenantId, number: i, zone, status: 'empty' });
    }
  });

  return { doors, spots };
}

// POST /api/tenants/signup — create a new tenant + admin user
router.post('/signup', async (req, res) => {
  const { companyName, adminName, adminEmail, adminPassword } = req.body;
  if (!companyName || !adminEmail || !adminPassword || !adminName) {
    return res.status(400).json({ error: 'companyName, adminName, adminEmail, adminPassword required' });
  }

  // 1. Create Supabase auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true
  });
  if (authError) return res.status(400).json({ error: authError.message });

  // 2. Create tenant row
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({
      name: companyName,
      slug,
      plan: 'starter',
      status: 'trial',
      settings: { companyName, facilityName: '', address: '', timezone: 'US/Central', opStart: '05:00', opEnd: '23:00' }
    })
    .select().single();
  if (tenantError) return res.status(500).json({ error: tenantError.message });

  // 3. Create profile for admin user
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authData.user.id,
    tenant_id: tenant.id,
    name: adminName,
    email: adminEmail,
    role: 'admin',
    status: 'active'
  });
  if (profileError) return res.status(500).json({ error: profileError.message });

  // 4. Stamp tenant_id + role into the auth user's app_metadata (used by JWT + RLS)
  await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { tenant_id: tenant.id, role: 'admin' }
  });

  // 5. Seed default channels
  const channels = DEFAULT_CHANNELS.map(c => ({ ...c, tenant_id: tenant.id }));
  await supabaseAdmin.from('message_channels').insert(channels);

  // 6. Seed default yard layout (10 doors, 21 spots across zones A/B/C)
  const { doors, spots } = buildDefaultYard(tenant.id);
  await supabaseAdmin.from('dock_doors').insert(doors);
  await supabaseAdmin.from('yard_spots').insert(spots);

  // 7. Create trial subscription row
  await supabaseAdmin.from('subscriptions').insert({
    tenant_id: tenant.id,
    plan: 'trial',
    status: 'trialing',
    current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  });

  res.json({ message: 'Tenant created successfully', tenantId: tenant.id, slug: tenant.slug });
});

// GET /api/tenants/me — get current tenant info
router.get('/me', requireAuth, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const db = getUserClient(token);
  const { data, error } = await db.from('tenants').select('*').eq('id', req.tenantId).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/tenants/settings — update tenant settings (JSON blob)
router.patch('/settings', requireAuth, requireRole('admin'), async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const db = getUserClient(token);
  const { data, error } = await db.from('tenants')
    .update({ settings: req.body })
    .eq('id', req.tenantId)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'settings_update', 'tenant', req.tenantId, req.body);
  res.json(data);
});

// POST /api/tenants/seed-yard — (re)seed dock doors and yard spots
// Useful for resetting a demo tenant or after a plan upgrade changes capacity.
// Body: { dockDoors: [{id, number, type}], yardSpots: [{id, number, zone}] }
// If body is empty, uses the default layout.
router.post('/seed-yard', requireAuth, requireRole('admin'), async (req, res) => {
  const { dockDoors: customDoors, yardSpots: customSpots } = req.body;

  const { doors: defaultDoors, spots: defaultSpots } = buildDefaultYard(req.tenantId);
  const doors = customDoors || defaultDoors;
  const spots  = customSpots  || defaultSpots;

  // Clear existing and re-insert
  await supabaseAdmin.from('dock_doors').delete().eq('tenant_id', req.tenantId);
  await supabaseAdmin.from('yard_spots').delete().eq('tenant_id', req.tenantId);

  const doorsToInsert = doors.map(d => ({
    id: d.id, tenant_id: req.tenantId, number: d.number, type: d.type || 'Inbound', status: 'available'
  }));
  const spotsToInsert = spots.map(s => ({
    id: s.id, tenant_id: req.tenantId, number: s.number, zone: s.zone || 'A', status: 'empty'
  }));

  const { error: dErr } = await supabaseAdmin.from('dock_doors').insert(doorsToInsert);
  if (dErr) return res.status(500).json({ error: dErr.message });

  const { error: sErr } = await supabaseAdmin.from('yard_spots').insert(spotsToInsert);
  if (sErr) return res.status(500).json({ error: sErr.message });

  await writeAudit(req.tenantId, req.userId, 'yard_seeded', 'tenant', req.tenantId,
    { doors: doorsToInsert.length, spots: spotsToInsert.length });

  res.json({ doors: doorsToInsert.length, spots: spotsToInsert.length });
});

module.exports = router;
