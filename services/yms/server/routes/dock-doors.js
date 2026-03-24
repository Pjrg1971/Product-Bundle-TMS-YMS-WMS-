/**
 * Dock Doors Routes
 */
const router = require('express').Router();
const { requireAuth, requireRole, getUserClient, writeAudit } = require('../middleware/auth');

// GET /api/dock-doors
router.get('/', requireAuth, async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('dock_doors').select('*').order('number');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/dock-doors/:id — update door status/fields
router.patch('/:id', requireAuth, requireRole('admin','yard_manager','dock_supervisor'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('dock_doors')
    .update(req.body)
    .eq('id', req.params.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'door_update', 'dock_door', req.params.id, req.body, req.ip);
  res.json(data);
});

// POST /api/dock-doors/:id/assign — assign a trailer to a door
router.post('/:id/assign', requireAuth, requireRole('admin','yard_manager','dock_supervisor','gate_officer'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { trailer, driver, customer, company, loadStatus } = req.body;
  const { data, error } = await db.from('dock_doors')
    .update({
      status: 'occupied', current_trailer: trailer, current_driver: driver,
      customer, company, load_status: loadStatus, assigned_since: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'door_assign', 'dock_door', req.params.id,
    { trailer, driver, customer, company }, req.ip);
  res.json(data);
});

// POST /api/dock-doors/:id/clear — clear a door
router.post('/:id/clear', requireAuth, requireRole('admin','yard_manager','dock_supervisor'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('dock_doors')
    .update({ status: 'available', current_trailer: null, current_driver: null,
              customer: null, company: null, load_status: null, assigned_since: null })
    .eq('id', req.params.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'door_clear', 'dock_door', req.params.id, {}, req.ip);
  res.json(data);
});

module.exports = router;
