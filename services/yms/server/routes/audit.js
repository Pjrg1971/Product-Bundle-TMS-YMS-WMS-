/**
 * Audit Log Routes
 * Read-only access to the immutable audit trail (admin/yard_manager only)
 */
const router = require('express').Router();
const { requireAuth, requireRole, getUserClient } = require('../middleware/auth');

// GET /api/audit — list audit entries for the tenant
// Query params: limit, offset, entityType, action, userId
router.get('/', requireAuth, requireRole('admin', 'yard_manager'), async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { limit = 100, offset = 0, entityType, action, userId } = req.query;

  let query = db
    .from('audit_log')
    .select('*, profiles(name, email)')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (entityType) query = query.eq('entity_type', entityType);
  if (action)     query = query.eq('action', action);
  if (userId)     query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
