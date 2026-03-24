/**
 * Messaging Routes
 */
const router = require('express').Router();
const { requireAuth, getUserClient } = require('../middleware/auth');

// GET /api/messages/channels
router.get('/channels', requireAuth, async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('message_channels').select('*').order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/messages/:channelId — fetch messages for a channel
router.get('/:channelId', requireAuth, async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db.from('messages')
    .select('*').eq('channel_id', req.params.channelId)
    .order('created_at', { ascending: true }).limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/messages/:channelId — send a message
router.post('/:channelId', requireAuth, async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { text, sender, incoming = false } = req.body;
  const { data, error } = await db.from('messages').insert({
    tenant_id: req.tenantId, channel_id: req.params.channelId,
    sender, text, incoming, user_id: req.userId
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
