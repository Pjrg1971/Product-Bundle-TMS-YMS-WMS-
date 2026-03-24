/**
 * InboundArrivalController — HTTP handler for inbound trailer arrival endpoints.
 *
 * Endpoints:
 *   POST   /api/inbound/arrive         — Arrive a trailer (primary action)
 *   GET    /api/inbound/manifest/:id   — Get manifest details
 *   GET    /api/inbound/arrival/:id    — Get arrival audit record
 *   GET    /api/inbound/scan-context   — Get manual scan fallback context
 *   GET    /api/inbound/arrivals       — List arrivals for facility
 *
 * All endpoints require authentication (requireAuth middleware).
 * Arrive and scan-context require yard_worker, yard_manager, or admin role.
 */

import { Request, Response } from 'express';
import { TrailerArrivalService } from '../services/TrailerArrivalService';
import { IManifestRepository, IArrivalAuditRepository } from '../repositories';
import { ArriveTrailerRequest, ReceiveMethod } from '../models';

export class InboundArrivalController {
  private readonly arrivalService: TrailerArrivalService;
  private readonly manifestRepo: IManifestRepository;
  private readonly auditRepo: IArrivalAuditRepository;

  constructor(deps: {
    arrivalService: TrailerArrivalService;
    manifestRepo: IManifestRepository;
    auditRepo: IArrivalAuditRepository;
  }) {
    this.arrivalService = deps.arrivalService;
    this.manifestRepo = deps.manifestRepo;
    this.auditRepo = deps.auditRepo;
  }

  // ── POST /api/inbound/arrive ──────────────────────────────────────
  /**
   * Primary endpoint: Arrive a trailer.
   *
   * Request body:
   *   {
   *     trailer_number: string (required)
   *     truck_id?: string
   *     carrier_code?: string
   *     shipper_id?: string
   *     facility_id: string (required)
   *     door_id?: string
   *     override_reason?: string
   *     notes?: string
   *   }
   *
   * The user_id is extracted from the authenticated JWT (req.userId).
   *
   * Response (200):
   *   ArriveTrailerResponse — includes receive_method, counts, and
   *   whether manual scan is required.
   */
  async arrive(req: Request, res: Response): Promise<void> {
    try {
      const { trailer_number, truck_id, carrier_code, shipper_id,
              facility_id, door_id, override_reason, notes } = req.body;

      // Validate required fields
      if (!trailer_number || !facility_id) {
        res.status(400).json({
          error: 'trailer_number and facility_id are required',
        });
        return;
      }

      // Override reason is required if the user is forcing manual scan
      if (override_reason && !override_reason.trim()) {
        res.status(400).json({
          error: 'override_reason cannot be empty when provided',
        });
        return;
      }

      const request: ArriveTrailerRequest = {
        trailer_number: trailer_number.trim().toUpperCase(),
        truck_id: truck_id?.trim() || undefined,
        carrier_code: carrier_code?.trim() || undefined,
        shipper_id: shipper_id?.trim() || undefined,
        facility_id: facility_id.trim(),
        door_id: door_id?.trim() || undefined,
        user_id: (req as any).userId, // Set by requireAuth middleware
        override_reason: override_reason?.trim() || undefined,
        notes: notes?.trim() || undefined,
      };

      const response = await this.arrivalService.arriveTrailer(request);

      // Use 200 for success, 200 for idempotent duplicate
      const statusCode = response.success ? 200 : 500;
      res.status(statusCode).json(response);

    } catch (err) {
      console.error('[InboundArrivalController] arrive() error:', err);
      res.status(500).json({
        error: 'Failed to process trailer arrival',
        detail: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // ── GET /api/inbound/manifest/:id ─────────────────────────────────
  /**
   * Get manifest details by ID.
   * Used by the UI to display manifest info before/after arrival.
   */
  async getManifest(req: Request, res: Response): Promise<void> {
    try {
      const manifest = await this.manifestRepo.findById(req.params.id);
      if (!manifest) {
        res.status(404).json({ error: 'Manifest not found' });
        return;
      }
      res.json(manifest);
    } catch (err) {
      console.error('[InboundArrivalController] getManifest() error:', err);
      res.status(500).json({ error: 'Failed to retrieve manifest' });
    }
  }

  // ── GET /api/inbound/arrival/:id ──────────────────────────────────
  /**
   * Get a specific arrival audit record.
   */
  async getArrival(req: Request, res: Response): Promise<void> {
    try {
      const arrival = await this.auditRepo.findById(req.params.id);
      if (!arrival) {
        res.status(404).json({ error: 'Arrival record not found' });
        return;
      }
      res.json(arrival);
    } catch (err) {
      console.error('[InboundArrivalController] getArrival() error:', err);
      res.status(500).json({ error: 'Failed to retrieve arrival record' });
    }
  }

  // ── GET /api/inbound/scan-context?trailer_number=XXX ──────────────
  /**
   * Get the manual scan context for a trailer.
   * Returns the reason manual scan is required and any validation errors.
   * The UI uses this to display appropriate instructions to the dock worker.
   */
  async getScanContext(req: Request, res: Response): Promise<void> {
    try {
      const trailerNumber = req.query.trailer_number as string;
      if (!trailerNumber) {
        res.status(400).json({ error: 'trailer_number query param is required' });
        return;
      }

      const context = await this.arrivalService.getManualScanContext(
        trailerNumber.trim().toUpperCase()
      );
      res.json(context);
    } catch (err) {
      console.error('[InboundArrivalController] getScanContext() error:', err);
      res.status(500).json({ error: 'Failed to retrieve scan context' });
    }
  }

  // ── GET /api/inbound/arrivals?facility_id=X&from=X&to=X ──────────
  /**
   * List arrivals for a facility within a date range.
   * Used for the supervisor dashboard and audit review.
   */
  async listArrivals(req: Request, res: Response): Promise<void> {
    try {
      const facilityId = req.query.facility_id as string;
      const from = req.query.from as string;
      const to = req.query.to as string;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!facilityId) {
        res.status(400).json({ error: 'facility_id query param is required' });
        return;
      }

      const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to) : new Date();

      const arrivals = await this.auditRepo.listByFacility(
        facilityId, fromDate, toDate, limit
      );
      res.json({ arrivals, count: arrivals.length });
    } catch (err) {
      console.error('[InboundArrivalController] listArrivals() error:', err);
      res.status(500).json({ error: 'Failed to list arrivals' });
    }
  }
}
