# Cowork Logistics Platform

Unified logistics platform integrating **TMS** (Transportation Management), **WMS** (Warehouse Management), and **YMS** (Yard Management) with a shared PostgreSQL backend and cross-system event bus.

## Architecture

```
                        ┌─────────────────────────┐
                        │     API Gateway :3000    │
                        │  (proxy + event bus)     │
                        └────┬──────┬──────┬──────┘
                             │      │      │
              ┌──────────────┘      │      └──────────────┐
              ▼                     ▼                     ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │   TMS :4100      │  │   WMS :8000      │  │   YMS :4000      │
   │  Node/Express/TS │  │  Python/FastAPI   │  │  Node/Express    │
   │                  │  │                  │  │  + Supabase      │
   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  ▼
                    ┌──────────────────────────┐
                    │   PostgreSQL :5432        │
                    │                          │
                    │  ┌────────┐ ┌────────┐   │
                    │  │ shared │ │  tms   │   │
                    │  └────────┘ └────────┘   │
                    │  ┌────────┐ ┌────────┐   │
                    │  │  wms   │ │  yms   │   │
                    │  └────────┘ └────────┘   │
                    └──────────────────────────┘
```

### Cross-System Event Flow

Events are propagated via PostgreSQL `LISTEN/NOTIFY`:

| Event | Source | Consumers | Description |
|-------|--------|-----------|-------------|
| `shipment.tendered` | TMS | WMS, Gateway | Shipment tendered to carrier |
| `trailer.arrived` | YMS | TMS, Gateway | Trailer checked in at gate |
| `dock.assigned` | YMS | WMS, Gateway | Trailer assigned to dock door |
| `shipment.packed` | WMS | TMS, Gateway | Shipment packing completed |
| `trailer.departed` | YMS | TMS, Gateway | Trailer checked out of yard |

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 16+ (or Docker)
- npm 10+

### Option A: Docker (recommended)

```bash
cp .env.example .env
docker compose up -d
```

All services start automatically. Gateway available at `http://localhost:3000`.

### Option B: Local Development

```bash
# 1. Start PostgreSQL (via Docker or local install)
docker compose up -d postgres

# 2. Install dependencies
npm install
pip install -r services/wms/backend/requirements.txt
cd services/yms/server && npm install && cd ../../..

# 3. Run migrations and seed
cp .env.example .env
npm run db:migrate
npm run db:seed

# 4. Start all services
npm run dev
```

## Service Endpoints

| Service | Port | Base URL |
|---------|------|----------|
| Gateway | 3000 | `http://localhost:3000` |
| TMS | 4100 | `http://localhost:4100/api` |
| WMS | 8000 | `http://localhost:8000/api/v1` |
| YMS | 4000 | `http://localhost:4000/api` |

### Via Gateway (recommended)

```
GET  /api/tms/*        → TMS endpoints
GET  /api/wms/*        → WMS endpoints
GET  /api/yms/*        → YMS endpoints
GET  /api/shared/*     → Cross-system queries
GET  /health           → Gateway health
```

## Database Schemas

### `shared` — Cross-Domain Entities
- `shared.facilities` — All facilities across systems
- `shared.carriers` — Carrier/trading partner master
- `shared.trailers` — Trailer tracking
- `shared.shipment_xref` — Cross-system ID mapping
- `shared.integration_events` — Event bus backing store

### `tms` — Transportation Management
- Shipments, loads, stops, tenders
- Tracking events, milestones, exceptions
- Invoices and charges
- Lanes, rates, schedules, SLAs
- Live assets, positions, geofences

### `wms` — Warehouse Management
- Items, lanes, shipment plans
- Shipments, shipment lines
- Pallets, cartons
- Bills of lading, dock appointments

### `yms` — Yard Management
- Tenants, profiles (multi-tenant)
- Dock doors, yard spots
- Gate log, audit log
- Messages, subscriptions

## Project Structure

```
cowork-logistics-platform/
├── docker-compose.yml
├── package.json                  # Root workspace config
├── .env.example
├── db/
│   ├── migrations/               # SQL migrations (run in order)
│   │   ├── 000_extensions.sql
│   │   ├── 001_shared_schema.sql
│   │   ├── 002_tms_schema.sql
│   │   ├── 003_wms_schema.sql
│   │   ├── 004_yms_schema.sql
│   │   └── 005_event_functions.sql
│   └── seeds/
│       └── 001_shared_seed.sql
├── scripts/
│   ├── migrate.sh
│   ├── seed.sh
│   └── reset-db.sh
├── services/
│   ├── shared/                   # Shared TypeScript package
│   │   └── src/
│   │       ├── db/pool.ts
│   │       ├── events/event-bus.ts
│   │       └── types/events.ts
│   ├── gateway/                  # API Gateway + Event Router
│   │   └── src/
│   │       ├── index.ts
│   │       ├── proxy.ts
│   │       └── routes/
│   ├── tms/                      # Transportation Management
│   │   ├── server/src/
│   │   │   ├── repositories/
│   │   │   │   ├── in-memory.ts  # Dev/test
│   │   │   │   └── postgres.ts   # Production
│   │   │   ├── services/
│   │   │   ├── routes/
│   │   │   └── types/
│   │   └── client/src/           # React UI
│   ├── wms/                      # Warehouse Management
│   │   ├── backend/app/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   ├── events/           # Event publisher
│   │   │   └── api/routes/
│   │   └── frontend/src/         # React UI
│   └── yms/                      # Yard Management
│       ├── server/
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── events.js         # Event publisher
│       └── supabase/
│           └── schema.sql
└── .github/
    └── workflows/ci.yml
```

## Development

### Adding a New Cross-System Event

1. Add the event type to `services/shared/src/types/events.ts`
2. Add the database trigger in `db/migrations/005_event_functions.sql`
3. Register the handler in `services/gateway/src/routes/event-handlers.ts`

### Switching TMS from In-Memory to PostgreSQL

Set the environment variable:
```bash
USE_POSTGRES=true
```

The TMS server auto-selects PostgreSQL repositories when this is set. In-memory mode is available for rapid development without a database.

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Reset everything (WARNING: drops all data)
npm run db:reset

# Seed reference data
npm run db:seed
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| TMS Backend | Node.js, Express 5, TypeScript |
| TMS Frontend | React 19, Vite, Tailwind CSS |
| WMS Backend | Python 3.12, FastAPI, SQLAlchemy 2 |
| WMS Frontend | React 18, Vite, TypeScript |
| YMS Backend | Node.js, Express 4, Supabase |
| YMS Frontend | Next.js 16, React 19, Tailwind |
| Database | PostgreSQL 16 |
| Event Bus | PostgreSQL LISTEN/NOTIFY |
| Gateway | Node.js, Express, http-proxy-middleware |
| Auth | Supabase JWT (extendable to all services) |
| Billing | Stripe (YMS) |
| CI/CD | GitHub Actions |
| Containers | Docker Compose |
