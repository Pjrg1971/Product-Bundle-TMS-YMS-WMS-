import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { startEventListener, stopEventListener, closePool } from '@cowork/shared';
import proxyRouter from './proxy';
import sharedRoutes from './routes/shared-routes';
import { registerEventHandlers } from './routes/event-handlers';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({
    service: 'gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Shared routes (must come before proxy routes)
app.use('/api/shared', sharedRoutes);

// Proxy routes to downstream services
app.use(proxyRouter);

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('[Gateway] Shutting down...');
  await stopEventListener();
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start(): Promise<void> {
  try {
    // Register event handlers before starting listener
    registerEventHandlers();
    await startEventListener();

    app.listen(PORT, () => {
      console.log(`[Gateway] API Gateway running on port ${PORT}`);
      console.log(`[Gateway] TMS proxy -> ${process.env.TMS_URL || 'http://localhost:4100'}`);
      console.log(`[Gateway] WMS proxy -> ${process.env.WMS_URL || 'http://localhost:8000'}`);
      console.log(`[Gateway] YMS proxy -> ${process.env.YMS_URL || 'http://localhost:4000'}`);
    });
  } catch (err) {
    console.error('[Gateway] Failed to start:', err);
    process.exit(1);
  }
}

start();
