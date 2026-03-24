/**
 * Subscriptions Routes
 * Exposes subscription state and Stripe billing flows
 */
const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { requireAuth, requireRole, getUserClient, supabaseAdmin } = require('../middleware/auth');

// GET /api/subscriptions/me — current tenant's subscription
router.get('/me', requireAuth, async (req, res) => {
  const db = getUserClient(req.headers.authorization.split(' ')[1]);
  const { data, error } = await db
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/subscriptions/checkout — create a Stripe Checkout Session to subscribe / upgrade
// Body: { priceId, successUrl, cancelUrl }
router.post('/checkout', requireAuth, requireRole('admin'), async (req, res) => {
  const { priceId, successUrl, cancelUrl } = req.body;
  if (!priceId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'priceId, successUrl, cancelUrl required' });
  }

  // Look up (or create) Stripe customer for this tenant
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('stripe_customer_id, name, settings')
    .eq('id', req.tenantId)
    .single();
  if (tenantErr) return res.status(500).json({ error: tenantErr.message });

  let customerId = tenant.stripe_customer_id;
  if (!customerId) {
    // Fetch admin email from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', req.userId)
      .single();

    const customer = await stripe.customers.create({
      email: profile?.email,
      name: tenant.name,
      metadata: { tenant_id: req.tenantId },
    });
    customerId = customer.id;

    await supabaseAdmin
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', req.tenantId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenant_id: req.tenantId },
    subscription_data: { metadata: { tenant_id: req.tenantId } },
  });

  res.json({ url: session.url, sessionId: session.id });
});

// POST /api/subscriptions/portal — create a Stripe Customer Portal session
// Body: { returnUrl }
router.post('/portal', requireAuth, requireRole('admin'), async (req, res) => {
  const { returnUrl } = req.body;
  if (!returnUrl) return res.status(400).json({ error: 'returnUrl required' });

  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', req.tenantId)
    .single();
  if (tenantErr) return res.status(500).json({ error: tenantErr.message });
  if (!tenant.stripe_customer_id) {
    return res.status(400).json({ error: 'No active Stripe subscription found for this tenant' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: returnUrl,
  });

  res.json({ url: session.url });
});

module.exports = router;
