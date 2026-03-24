import { Router, Request, Response } from 'express';
import { getPool } from '@cowork/shared';

const router = Router();

// GET /api/shared/facilities - list all facilities
router.get('/facilities', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM shared.facilities ORDER BY name');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[SharedRoutes] Error fetching facilities:', err);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

// GET /api/shared/carriers - list all carriers
router.get('/carriers', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM shared.carriers ORDER BY name');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[SharedRoutes] Error fetching carriers:', err);
    res.status(500).json({ error: 'Failed to fetch carriers' });
  }
});

// GET /api/shared/trailers - list all trailers
router.get('/trailers', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM shared.trailers ORDER BY trailer_number');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[SharedRoutes] Error fetching trailers:', err);
    res.status(500).json({ error: 'Failed to fetch trailers' });
  }
});

// GET /api/shared/xref/:tmsShipmentId - get cross-reference for a TMS shipment
router.get('/xref/:tmsShipmentId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM shared.shipment_xref WHERE tms_shipment_id = $1',
      [req.params.tmsShipmentId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cross-reference not found' });
      return;
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[SharedRoutes] Error fetching xref:', err);
    res.status(500).json({ error: 'Failed to fetch cross-reference' });
  }
});

// GET /api/shared/events - list recent integration events
router.get('/events', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const result = await pool.query(
      'SELECT * FROM shared.integration_events ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[SharedRoutes] Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/shared/xref - create a cross-reference
router.post('/xref', async (req: Request, res: Response) => {
  try {
    const { tms_shipment_id, wms_shipment_id, yms_gate_log_id, carrier_id } = req.body;
    if (!tms_shipment_id) {
      res.status(400).json({ error: 'tms_shipment_id is required' });
      return;
    }
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO shared.shipment_xref (tms_shipment_id, wms_shipment_id, yms_gate_log_id, carrier_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tms_shipment_id, wms_shipment_id || null, yms_gate_log_id || null, carrier_id || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('[SharedRoutes] Error creating xref:', err);
    res.status(500).json({ error: 'Failed to create cross-reference' });
  }
});

// GET /api/shared/health - aggregated health check of all services
router.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  // Check database
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    checks.database = 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }

  // Check downstream services
  const services = [
    { name: 'tms', url: process.env.TMS_URL || 'http://localhost:4100' },
    { name: 'wms', url: process.env.WMS_URL || 'http://localhost:8000' },
    { name: 'yms', url: process.env.YMS_URL || 'http://localhost:4000' },
  ];

  for (const service of services) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${service.url}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      checks[service.name] = response.ok ? 'healthy' : 'unhealthy';
    } catch {
      checks[service.name] = 'unreachable';
    }
  }

  const allHealthy = Object.values(checks).every(s => s === 'healthy');
  res.status(allHealthy ? 200 : 207).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
