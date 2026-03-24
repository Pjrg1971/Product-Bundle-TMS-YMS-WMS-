# Radixx — Local Setup Guide

## Prerequisites

### 1. Install Node.js (required)
Go to https://nodejs.org and download the **LTS** version (v20+). Run the installer.

Verify it worked:
```bash
node --version   # should print v20.x.x or higher
npm --version    # should print 10.x.x or higher
```

### 2. Supabase Project (free tier works)
1. Go to https://supabase.com and create a new project
2. In the Supabase dashboard, go to **SQL Editor** and paste + run the contents of `supabase/schema.sql`
3. Copy these values from **Project Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`
   - JWT Secret → `SUPABASE_JWT_SECRET`

### 3. Stripe Account (optional for dev, required for billing)
1. Go to https://stripe.com and create an account
2. Use **Test mode** keys during development (`sk_test_...`)
3. Create 3 products: Starter ($499/mo), Pro ($1,299/mo), Enterprise (custom)
4. Copy each price ID into your `.env`

---

## Local Development

### Step 1 — Create your .env file
```bash
cd production/server
cp ../.env.example .env
```
Edit `.env` and fill in your Supabase values. Stripe values can be dummy strings for initial testing.

### Step 2 — Install dependencies
```bash
cd production/server
npm install
```

### Step 3 — Start the API server
```bash
npm run dev     # uses nodemon (auto-restarts on file changes)
# or
npm start       # plain node
```

The server will start on **http://localhost:4000**

Test it:
```bash
curl http://localhost:4000/health
# → {"status":"ok","ts":"..."}
```

### Step 4 — Open the frontend
Open `production/client/index.html` in a text editor and fill in the three config values at the top of the `<script>` block:

```js
const SUPABASE_URL   = 'https://YOUR_PROJECT.supabase.co';   // from Supabase dashboard
const SUPABASE_ANON_KEY = 'eyJh...';                         // anon key
const API_BASE       = 'http://localhost:4000/api';          // your running server
```

Then open `production/client/index.html` in your browser (or serve it with any static server):
```bash
npx serve production/client   # serves on http://localhost:3000
```

---

## API Endpoints Reference

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/tenants/signup` | None | — | Create tenant + admin user |
| GET | `/api/tenants/me` | JWT | Any | Get current tenant |
| PATCH | `/api/tenants/settings` | JWT | admin | Update facility settings |
| POST | `/api/tenants/seed-yard` | JWT | admin | Re-seed dock doors + yard spots |
| GET | `/api/gate` | JWT | Any | List gate entries |
| POST | `/api/gate` | JWT | gate_officer+ | Check in truck |
| POST | `/api/gate/:id/checkout` | JWT | gate_officer+ | Check out truck |
| PATCH | `/api/gate/:id` | JWT | gate_officer+ | Edit gate entry |
| DELETE | `/api/gate/:id` | JWT | yard_manager+ | Delete gate entry |
| GET | `/api/dock-doors` | JWT | Any | List all dock doors |
| POST | `/api/dock-doors/:id/assign` | JWT | dock_supervisor+ | Assign trailer |
| POST | `/api/dock-doors/:id/clear` | JWT | dock_supervisor+ | Clear door |
| PATCH | `/api/dock-doors/:id` | JWT | dock_supervisor+ | Update door |
| GET | `/api/yard-spots` | JWT | Any | List yard spots |
| POST | `/api/yard-spots/:id/assign` | JWT | forklift_operator+ | Assign trailer |
| POST | `/api/yard-spots/:id/clear` | JWT | forklift_operator+ | Clear spot |
| POST | `/api/yard-spots/move` | JWT | forklift_operator+ | Move trailer |
| GET | `/api/messages/channels` | JWT | Any | List channels |
| GET | `/api/messages/:channelId` | JWT | Any | Get channel messages |
| POST | `/api/messages/:channelId` | JWT | Any | Send message |
| GET | `/api/users` | JWT | yard_manager+ | List users |
| POST | `/api/users/invite` | JWT | admin | Invite user |
| PATCH | `/api/users/:id` | JWT | admin | Update user role/status |
| DELETE | `/api/users/:id` | JWT | admin | Delete user |
| GET | `/api/subscriptions/me` | JWT | Any | Get subscription |
| POST | `/api/subscriptions/checkout` | JWT | admin | Create Stripe checkout |
| POST | `/api/subscriptions/portal` | JWT | admin | Open billing portal |
| GET | `/api/audit` | JWT | yard_manager+ | View audit log |
| POST | `/api/stripe/webhook` | Stripe sig | — | Stripe events |
| GET | `/health` | None | — | Health check |

---

## Creating Your First Tenant

```bash
curl -X POST http://localhost:4000/api/tenants/signup \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Logistics",
    "adminName": "Jane Smith",
    "adminEmail": "jane@acmelogistics.com",
    "adminPassword": "SecurePass123!"
  }'
```

This automatically:
- Creates the Supabase auth user
- Creates the tenant row
- Creates the admin profile
- Seeds 6 message channels
- Seeds 10 dock doors (5 inbound + 5 outbound)
- Seeds 21 yard spots (7 per zone A/B/C)
- Creates a 14-day trial subscription
