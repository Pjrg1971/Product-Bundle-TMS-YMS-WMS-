/**
 * Yard Spots Routes
 */
const router = require('express').Router();
const { requireAuth, requireRole, getUserClient, writeAudit } = require('../middleware/auth');

// GET /api/yard-spots
router.get('/', requireAuth, async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { zone } = req.query;
  let query = db.from('yard_spots').select('*').order('zone').order('number');
  if (zone) query = query.eq('zone', zone);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/yard-spots/:id
router.patch('/:id', requireAuth, requireRole('admin','yard_manager','forklift_operator'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('yard_spots')
    .update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'spot_update', 'yard_spot', req.params.id, req.body, req.ip);
  res.json(data);
});

// POST /api/yard-spots/:id/assign
router.post('/:id/assign', requireAuth, requireRole('admin','yard_manager','forklift_operator','gate_officer'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { trailer, trailerType, loadStatus, company, customer, driverName } = req.body;
  const { data, error } = await db.from('yard_spots')
    .update({ status: 'occupied', trailer, trailer_type: trailerType, load_status: loadStatus,
              company, customer, driver_name: driverName, parked_since: new Date().toISOString() })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'spot_assign', 'yard_spot', req.params.id,
    { trailer, company, customer }, req.ip);
  res.json(data);
});

// POST /api/yard-spots/:id/clear
router.post('/:id/clear', requireAuth, requireRole('admin','yard_manager','forklift_operator'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('yard_spots')
    .update({ status: 'empty', trailer: null, trailer_type: null, load_status: null,
              company: null, customer: null, driver_name: null, parked_since: null })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await writeAudit(req.tenantId, req.userId, 'spot_clear', 'yard_spot', req.params.id, {}, req.ip);
  res.json(data);
});

// POST /api/yard-spots/move — move trailer between spot/door
router.post('/move', requireAuth, requireRole('admin','yard_manager','forklift_operator'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { fromType, fromId, toType, toId } = req.body;

  // 1. Fetch source data
  let trailerData = null;
  if (fromType === 'spot') {
    const { data } = await db.from('yard_spots').select('*').eq('id', fromId).single();
    if (data) trailerData = { trailer: data.trailer, trailerType: data.trailer_type,
      loadStatus: data.load_status, company: data.company, customer: data.customer, driverName: data.driver_name };
  } else {
    const { data } = await db.from('dock_doors').select('*').eq('id', fromId).single();
    if (data) trailerData = { trailer: data.current_trailer, trailerType: null,
      loadStatus: data.load_status, company: data.company, customer: data.customer, driverName: data.current_driver };
  }
  if (!trailerData?.trailer) return res.status(400).json({ error: 'No trailer found at source' });

  // 2. Clear source
  if (fromType === 'spot') {
    await db.from('yard_spots').update({ status: 'empty', trailer: null, trailer_type: null,
      load_status: null, company: null, customer: null, driver_name: null, parked_since: null }).eq('id', fromId);
  } else {
    await db.from('dock_doors').update({ status: 'available', current_trailer: null, current_driver: null,
      customer: null, company: null, load_status: null, assigned_since: null }).eq('id', fromId);
  }

  // 3. Fill destination
  let result;
  if (toType === 'spot') {
    const { data } = await db.from('yard_spots').update({ status: 'occupied', trailer: trailerData.trailer,
      trailer_type: trailerData.trailerType, load_status: trailerData.loadStatus, company: trailerData.company,
      customer: trailerData.customer, driver_name: trailerData.driverName, parked_since: new Date().toISOString() })
      .eq('id', toId).select().single();
    result = data;
  } else {
    const { data } = await db.from('dock_doors').update({ status: 'occupied', current_trailer: trailerData.trailer,
      current_driver: trailerData.driverName, customer: trailerData.customer, company: trailerData.company,
      load_status: trailerData.loadStatus, assigned_since: new Date().toISOString() }).eq('id', toId).select().single();
    result = data;
  }

  await writeAudit(req.tenantId, req.userId, 'trailer_move', null, null,
    { trailer: trailerData.trailer, fromType, fromId, toType, toId }, req.ip);
  res.json({ success: true, destination: result });
});

module.exports = router;
