/**
 * Stripe Webhook Handler
 * Keeps tenant plan + subscription state in sync with Stripe
 */
const router  = require('express').Router();
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabaseAdmin } = require('../middleware/auth');

const PLAN_MAP = {
  [process.env.STRIPE_PRICE_STARTER]:    'starter',
  [process.env.STRIPE_PRICE_PRO]:        'pro',
  [process.env.STRIPE_PRICE_ENTERPRISE]: 'enterprise',
};

// Must use raw body for Stripe signature verification
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const sub = event.data.object;

  switch (event.type) {
    // Subscription created or updated
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const priceId = sub.items.data[0]?.price.id;
      const plan    = PLAN_MAP[priceId] || 'starter';
      const planLimits = { starter: [10,20,5], pro: [50,100,25], enterprise: [9999,9999,999] };
      const [maxDoors, maxSpots, maxUsers] = planLimits[plan];

      // Update subscriptions table
      await supabaseAdmin.from('subscriptions').upsert({
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer,
        plan, status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
      }, { onConflict: 'stripe_subscription_id' });

      // Update tenant plan + limits
      await supabaseAdmin.from('tenants')
        .update({ plan, status: 'active', stripe_subscription_id: sub.id,
                  max_dock_doors: maxDoors, max_yard_spots: maxSpots, max_users: maxUsers })
        .eq('stripe_customer_id', sub.customer);
      break;
    }

    // Payment succeeded
    case 'invoice.payment_succeeded': {
      await supabaseAdmin.from('tenants')
        .update({ status: 'active' })
        .eq('stripe_customer_id', sub.customer);
      break;
    }

    // Payment failed — suspend the tenant
    case 'invoice.payment_failed': {
      await supabaseAdmin.from('tenants')
        .update({ status: 'suspended' })
        .eq('stripe_customer_id', sub.customer);
      break;
    }

    // Subscription cancelled
    case 'customer.subscription.deleted': {
      await supabaseAdmin.from('tenants')
        .update({ status: 'cancelled', plan: 'starter' })
        .eq('stripe_customer_id', sub.customer);
      await supabaseAdmin.from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    default:
      break;
  }

  res.json({ received: true });
});

module.exports = router;
