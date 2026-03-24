/**
 * Gate Log Routes
 */
const router = require('express').Router();
const { requireAuth, requireRole, getUserClient, writeAudit } = require('../middleware/auth');

// GET /api/gate — list all gate entries (most recent first)
router.get('/', requireAuth, async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { status, direction, limit = 100, offset = 0 } = req.query;

  let query = db.from('gate_log').select('*').order('arrival', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status)    query = query.eq('status', status);
  if (direction) query = query.eq('direction', direction);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, count });
});

// POST /api/gate — check in a truck
router.post('/', requireAuth, requireRole('admin','yard_manager','gate_officer'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const entry = {
    ...req.body,
    tenant_id: req.tenantId,
    arrival: new Date().toISOString(),
    status: 'On Site',
    checked_in_by: req.userId
  };

  const { data, error } = await db.from('gate_log').insert(entry).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'gate_checkin', 'gate_log', data.id,
    { trailer_id: data.trailer_id, driver: data.driver_name, company: data.trucking_company },
    req.ip);
  res.status(201).json(data);
});

// PATCH /api/gate/:id — update a gate entry (edit details)
router.patch('/:id', requireAuth, requireRole('admin','yard_manager','gate_officer'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('gate_log')
    .update(req.body)
    .eq('id', req.params.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/gate/:id/checkout — check out a truck
router.post('/:id/checkout', requireAuth, requireRole('admin','yard_manager','gate_officer'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('gate_log')
    .update({ status: 'Departed', departure: new Date().toISOString(), checked_out_by: req.userId })
    .eq('id', req.params.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'gate_checkout', 'gate_log', req.params.id,
    { trailer_id: data.trailer_id }, req.ip);
  res.json(data);
});

// DELETE /api/gate/:id
router.delete('/:id', requireAuth, requireRole('admin','yard_manager'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { error } = await db.from('gate_log').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'gate_delete', 'gate_log', req.params.id, {}, req.ip);
  res.json({ success: true });
});

module.exports = router;
