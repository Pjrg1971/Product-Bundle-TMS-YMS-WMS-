/**
 * User Management Routes
 */
const router = require('express').Router();
const { requireAuth, requireRole, getUserClient, writeAudit, supabaseAdmin } = require('../middleware/auth');

// GET /api/users
router.get('/', requireAuth, requireRole('admin', 'yard_manager'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('profiles').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/users/invite — invite a new user to the tenant
router.post('/invite', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email, role required' });

  // Create auth user with a temp password (they'll get an invite email)
  const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + '!1';
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email, password: tempPassword, email_confirm: false,
    app_metadata: { tenant_id: req.tenantId, role }
  });
  if (authError) return res.status(400).json({ error: authError.message });

  const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authData.user.id, tenant_id: req.tenantId, name, email, role, status: 'invited'
  }).select().single();
  if (profileError) return res.status(500).json({ error: profileError.message });

  // Send invite email via Supabase
  await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { tenant_id: req.tenantId, role }
  });

  await writeAudit(req.tenantId, req.userId, 'user_invite', 'profile', profile.id, { email, role }, req.ip);
  res.status(201).json(profile);
});

// PATCH /api/users/:id — update role or status
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const allowedUpdates = ['role', 'status', 'name'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowedUpdates.includes(k)));

  const { data, error } = await db.from('profiles').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // If role changed, update app_metadata too
  if (updates.role) {
    await supabaseAdmin.auth.admin.updateUserById(req.params.id, {
      app_metadata: { tenant_id: req.tenantId, role: updates.role }
    });
  }

  await writeAudit(req.tenantId, req.userId, 'user_update', 'profile', req.params.id, updates, req.ip);
  res.json(data);
});

// DELETE /api/users/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot delete your own account' });
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'user_delete', 'profile', req.params.id, {}, req.ip);
  res.json({ success: true });
});

module.exports = router;
