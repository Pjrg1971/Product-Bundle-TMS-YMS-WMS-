/**
 * Inbound Arrival Routes — Express router for /api/inbound/*
 *
 * Mounts the InboundArrivalController methods with auth + RBAC middleware.
 *
 * Route table:
 *   POST   /api/inbound/arrive                — Arrive a trailer (TMS auto or manual fallback)
 *   GET    /api/inbound/manifest/:id          — Get manifest details
 *   GET    /api/inbound/arrival/:id           — Get arrival audit record
 *   GET    /api/inbound/scan-context          — Get manual scan context for a trailer
 *   GET    /api/inbound/arrivals              — List arrivals for a facility
 *
 * Auth requirements:
 *   - All endpoints require a valid JWT (requireAuth)
 *   - POST /arrive requires role: yard_worker, yard_manager, or admin
 *   - GET endpoints require role: viewer, yard_worker, yard_manager, or admin
 *
 * Integration note:
 *   To mount these routes in the existing Express server (index.js),
 *   you need to instantiate the controller with real repository and
 *   adapter implementations. See the commented example at the bottom.
 */

import { Router, Request, Response } from 'express';
import { InboundArrivalController } from '../controllers/InboundArrivalController';

/**
 * Factory function that creates the router with injected dependencies.
 * This pattern matches the existing Radixx route style while supporting
 * dependency injection for the TypeScript service layer.
 */
export function createInboundArrivalRouter(
  controller: InboundArrivalController,
  requireAuth: (req: Request, res: Response, next: Function) => void,
  requireRole: (...roles: string[]) => (req: Request, res: Response, next: Function) => void,
): Router {
  const router = Router();

  // ── Arrive a trailer ──────────────────────────────────────────────
  // This is the primary "Arrive Trailer" button endpoint.
  // Checks TMS for manifest → auto-arrives if valid → manual fallback if not.
  router.post(
    '/arrive',
    requireAuth,
    requireRole('yard_worker', 'yard_manager', 'admin'),
    (req: Request, res: Response) => controller.arrive(req, res),
  );

  // ── Get manifest details ──────────────────────────────────────────
  router.get(
    '/manifest/:id',
    requireAuth,
    requireRole('viewer', 'yard_worker', 'yard_manager', 'admin'),
    (req: Request, res: Response) => controller.getManifest(req, res),
  );

  // ── Get arrival audit record ──────────────────────────────────────
  router.get(
    '/arrival/:id',
    requireAuth,
    requireRole('viewer', 'yard_worker', 'yard_manager', 'admin'),
    (req: Request, res: Response) => controller.getArrival(req, res),
  );

  // ── Get manual scan context ───────────────────────────────────────
  // Called when arrival returns receive_method = MANUAL_SCAN_OVERRIDE.
  // Provides the dock worker with the reason and instructions.
  router.get(
    '/scan-context',
    requireAuth,
    requireRole('yard_worker', 'yard_manager', 'admin'),
    (req: Request, res: Response) => controller.getScanContext(req, res),
  );

  // ── List arrivals for facility ────────────────────────────────────
  router.get(
    '/arrivals',
    requireAuth,
    requireRole('viewer', 'yard_worker', 'yard_manager', 'admin'),
    (req: Request, res: Response) => controller.listArrivals(req, res),
  );

  return router;
}

// ═══════════════════════════════════════════════════════════════════════
// INTEGRATION EXAMPLE
// ═══════════════════════════════════════════════════════════════════════
//
// In your existing server/index.js, add:
//
//   const { createInboundArrivalRouter } = require('./src/inbound/routes/inbound-arrival');
//   const { InboundArrivalController } = require('./src/inbound/controllers/InboundArrivalController');
//   const { TrailerArrivalService } = require('./src/inbound/services/TrailerArrivalService');
//   const { ManifestValidationService } = require('./src/inbound/services/ManifestValidationService');
//
//   // Instantiate repositories (implement IManifestRepository, IArrivalAuditRepository)
//   const manifestRepo = new SupabaseManifestRepository(supabaseAdmin);
//   const auditRepo = new SupabaseArrivalAuditRepository(supabaseAdmin);
//
//   // Instantiate adapters (implement ITmsAdapter, IWmsAdapter)
//   const tmsAdapter = new ShippoTmsAdapter(process.env.SHIPPO_API_KEY);
//   const wmsAdapter = new SupabaseWmsAdapter(supabaseAdmin);
//
//   // Wire up the service
//   const arrivalService = new TrailerArrivalService({
//     manifestRepo, auditRepo, tmsAdapter, wmsAdapter,
//     validator: new ManifestValidationService(),
//   });
//
//   // Create controller and router
//   const arrivalController = new InboundArrivalController({
//     arrivalService, manifestRepo, auditRepo,
//   });
//
//   const inboundRouter = createInboundArrivalRouter(
//     arrivalController, requireAuth, requireRole,
//   );
//
//   app.use('/api/inbound', inboundRouter);
//
