/**
 * Radixx — API Server
 * Express + Supabase backend with JWT auth, RBAC, and Stripe billing
 */
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.set('trust proxy', 1); // trust first proxy (needed behind load balancer)

app.use(helmet());          // sets secure HTTP headers

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// Rate limiting — 200 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
}));

// Stricter rate limit on auth-related endpoints
app.use(['/api/tenants/signup'], rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many signup attempts.' },
}));

// ============================================================
// BODY PARSING
// Stripe webhooks need the raw body; everything else uses JSON
// ============================================================
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => {
  req.rawBody = req.body;
  next();
});
app.use(express.json({ limit: '1mb' }));

// ============================================================
// ROUTES
// ============================================================
app.use('/api/tenants',       require('./routes/tenants'));
app.use('/api/gate',          require('./routes/gate'));
app.use('/api/dock-doors',    require('./routes/dock-doors'));
app.use('/api/yard-spots',    require('./routes/yard-spots'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/audit',         require('./routes/audit'));
app.use('/api/stripe/webhook', require('./routes/stripe'));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ============================================================
// START
// ============================================================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Radixx API running on port ${PORT}`));
