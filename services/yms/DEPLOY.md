# Radixx — Deployment Guide

## Option A: Railway (Recommended — easiest)

Railway gives you a free tier and deploys directly from GitHub.

### Steps
1. Push `production/server/` to a GitHub repository
2. Go to https://railway.app → New Project → Deploy from GitHub repo
3. Select your repo
4. In the Railway dashboard, go to **Variables** and add all keys from `.env.example`
5. Railway auto-detects Node.js and runs `npm start`
6. Copy the generated Railway URL (e.g. `https://radixx-api.up.railway.app`)

### Set CORS
In Railway Variables, set:
```
CLIENT_ORIGIN=https://your-frontend-domain.com
```

---

## Option B: Render (Free tier available)

1. Push `production/server/` to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Build Command: `npm install`
5. Start Command: `node index.js`
6. Add all environment variables under **Environment**

---

## Option C: Fly.io

```bash
cd production/server
npm install -g flyctl
fly auth login
fly launch        # auto-detects Node.js, creates fly.toml
fly secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... # (repeat for all vars)
fly deploy
```

---

## Stripe Webhook Setup

After deploying, configure your Stripe webhook:

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter: `https://YOUR_DEPLOYED_URL/api/stripe/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing Secret** → set as `STRIPE_WEBHOOK_SECRET` in your env vars

---

## Frontend Deployment (static hosting)

The frontend (`production/client/index.html`) is a single HTML file.
Host it anywhere that serves static files:

| Platform | Steps |
|----------|-------|
| **Netlify** | Drag & drop `production/client/` into netlify.com/drop |
| **Vercel** | `vercel production/client/` (requires Vercel CLI) |
| **GitHub Pages** | Push `production/client/` to a GitHub repo, enable Pages |
| **S3 + CloudFront** | Upload `index.html` to an S3 bucket with static hosting |

Before deploying the frontend, update the three config values in `index.html`:
```js
const SUPABASE_URL   = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJh...your-anon-key...';
const API_BASE       = 'https://YOUR_DEPLOYED_API_URL/api';
```

---

## Environment Variable Checklist

Before going live, verify all these are set in your hosting platform:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_JWT_SECRET`
- [ ] `STRIPE_SECRET_KEY` (use `sk_live_...` in production)
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_STARTER`
- [ ] `STRIPE_PRICE_PRO`
- [ ] `STRIPE_PRICE_ENTERPRISE`
- [ ] `CLIENT_ORIGIN` (your frontend URL)
- [ ] `NODE_ENV=production`
- [ ] `PORT` (usually set automatically by the platform)
