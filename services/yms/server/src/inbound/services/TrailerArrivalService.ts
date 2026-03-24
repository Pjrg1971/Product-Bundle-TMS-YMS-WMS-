/**
 * TrailerArrivalService — Core business logic for inbound trailer arrival.
 *
 * This is the primary entry point for the "Arrive Trailer" action.
 * It orchestrates the entire flow:
 *
 *   1. Check idempotency (has this trailer already been arrived?)
 *   2. Query TMS for trailer/manifest data
 *   3. If manifest found → validate it
 *   4. If valid manifest → auto-arrive (TMS_AUTO_ARRIVAL)
 *      - Set trailer status = ARRIVED
 *      - Push all packages/pallets to WMS as RECEIVED_ON_DOCK
 *      - Create audit record
 *      - Publish arrival event
 *   5. If no/invalid manifest → return manual scan context
 *      - Set receive_method = MANUAL_SCAN_OVERRIDE
 *      - Do NOT push anything to WMS
 *      - Create audit record with override_reason
 *
 * Design decisions:
 *   - Idempotent: clicking "Arrive" twice returns the existing arrival
 *   - Never silently receives freight without a valid manifest
 *   - Every action is audited (who, when, what, why)
 *   - TMS failures are not fatal — they trigger manual scan fallback
 */

import {
  ArriveTrailerRequest,
  ArriveTrailerResponse,
  ManualScanContext,
  ReceiveMethod,
  PackageStatus,
  TrailerArrivalAudit,
  TrailerManifest,
  ManifestSource,
} from '../models';

import { IManifestRepository, IArrivalAuditRepository } from '../repositories';
import { ITmsAdapter, ICompositeTmsAdapter, TmsLookupResult } from '../adapters/TmsAdapter';
import { IWmsAdapter, WmsBatchReceiptRequest, WmsReceiptItem } from '../adapters/WmsAdapter';
import { ManifestValidationService } from './ManifestValidationService';

// ─── Event published after arrival ──────────────────────────────────
export interface InboundArrivalEvent {
  event_type: 'INBOUND_TRAILER_ARRIVED';
  arrival_id: string;
  trailer_number: string;
  receive_method: ReceiveMethod;
  package_count: number;
  pallet_count: number;
  facility_id: string;
  door_id: string | null;
  arrived_at: string;
  source_system: string;
}

// ─── Event publisher interface (implement for your message bus) ─────
export interface IEventPublisher {
  publish(event: InboundArrivalEvent): Promise<void>;
}

// ─── Service configuration ──────────────────────────────────────────
export interface TrailerArrivalServiceConfig {
  /** If true, TMS lookup failures are logged but don't block manual arrival */
  allowManualFallbackOnTmsError: boolean;
  /** Maximum age (ms) of a manifest before it's considered stale */
  manifestStalenessThresholdMs: number;
}

const DEFAULT_CONFIG: TrailerArrivalServiceConfig = {
  allowManualFallbackOnTmsError: true,
  manifestStalenessThresholdMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── The service ────────────────────────────────────────────────────
export class TrailerArrivalService {
  private readonly manifestRepo: IManifestRepository;
  private readonly auditRepo: IArrivalAuditRepository;
  private readonly tmsAdapter: ITmsAdapter | ICompositeTmsAdapter;
  private readonly wmsAdapter: IWmsAdapter;
  private readonly validator: ManifestValidationService;
  private readonly eventPublisher: IEventPublisher | null;
  private readonly config: TrailerArrivalServiceConfig;

  constructor(deps: {
    manifestRepo: IManifestRepository;
    auditRepo: IArrivalAuditRepository;
    tmsAdapter: ITmsAdapter | ICompositeTmsAdapter;
    wmsAdapter: IWmsAdapter;
    validator?: ManifestValidationService;
    eventPublisher?: IEventPublisher;
    config?: Partial<TrailerArrivalServiceConfig>;
  }) {
    this.manifestRepo = deps.manifestRepo;
    this.auditRepo = deps.auditRepo;
    this.tmsAdapter = deps.tmsAdapter;
    this.wmsAdapter = deps.wmsAdapter;
    this.validator = deps.validator ?? new ManifestValidationService();
    this.eventPublisher = deps.eventPublisher ?? null;
    this.config = { ...DEFAULT_CONFIG, ...deps.config };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIMARY METHOD: Arrive a trailer
  // ═══════════════════════════════════════════════════════════════════

  async arriveTrailer(request: ArriveTrailerRequest): Promise<ArriveTrailerResponse> {
    const { trailer_number, facility_id, door_id, user_id } = request;

    // ── Step 1: Idempotency check ───────────────────────────────────
    // Use trailer_number as a deterministic trailer_id for lookups.
    // In production, you'd resolve this from your trailer registry.
    const trailerId = this.resolveTrailerId(trailer_number);

    const existingArrival = await this.auditRepo.findLatestByTrailerId(trailerId);
    if (existingArrival && this.isRecentArrival(existingArrival)) {
      return this.buildIdempotentResponse(existingArrival);
    }

    // ── Step 2: Look for an existing manifest in our DB ─────────────
    let manifest = await this.manifestRepo.findByTrailer({
      trailer_number,
      truck_id: request.truck_id,
      carrier_code: request.carrier_code,
      shipper_id: request.shipper_id,
    });

    // ── Step 3: If no local manifest, query TMS ─────────────────────
    if (!manifest) {
      const tmsResult = await this.queryTms(request);

      if (tmsResult.found && tmsResult.data) {
        // Persist the manifest from TMS
        const { is_validated, validation_errors } = this.validator.validateAndMark({
          trailer_number: tmsResult.data.trailer_number,
          source: tmsResult.data.source,
          packages: tmsResult.data.packages,
          package_count: tmsResult.data.package_count,
          pallet_count: tmsResult.data.pallet_count,
          po_numbers: tmsResult.data.po_numbers,
        });

        manifest = await this.manifestRepo.create({
          trailer_number: tmsResult.data.trailer_number,
          truck_id: tmsResult.data.truck_id ?? undefined,
          carrier_code: tmsResult.data.carrier_code ?? undefined,
          shipper_id: tmsResult.data.shipper_id ?? undefined,
          source: tmsResult.data.source,
          po_numbers: tmsResult.data.po_numbers,
          packages: tmsResult.data.packages,
          is_validated,
          validation_errors,
          package_count: tmsResult.data.package_count,
          pallet_count: tmsResult.data.pallet_count,
        });
      } else if (tmsResult.error && !this.config.allowManualFallbackOnTmsError) {
        // TMS error and we're not allowed to fall back
        throw new Error(`TMS lookup failed and manual fallback is disabled: ${tmsResult.error}`);
      }
      // If TMS returned nothing and fallback is allowed, manifest stays null → manual scan
    }

    // ── Step 4: Check manifest validity ─────────────────────────────
    if (manifest && manifest.is_validated && !this.isManifestStale(manifest)) {
      // ✅ VALID MANIFEST → Auto-arrive via TMS
      return this.performAutoArrival(request, manifest, trailerId);
    }

    // ── Step 5: No valid manifest → Manual scan required ────────────
    return this.performManualFallback(request, manifest, trailerId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET MANUAL SCAN CONTEXT (for UI to show the right fallback screen)
  // ═══════════════════════════════════════════════════════════════════

  async getManualScanContext(trailerNumber: string): Promise<ManualScanContext> {
    const manifest = await this.manifestRepo.findByTrailer({
      trailer_number: trailerNumber,
    });

    if (!manifest) {
      return {
        trailer_number: trailerNumber,
        reason: 'NO_MANIFEST',
        validation_errors: [],
        instructions: 'No manifest found for this trailer. Scan each pallet/parcel individually.',
      };
    }

    if (!manifest.is_validated) {
      return {
        trailer_number: trailerNumber,
        reason: 'INVALID_MANIFEST',
        validation_errors: manifest.validation_errors.map(e => e.message),
        instructions: 'Manifest failed validation. Scan each pallet/parcel to verify freight.',
      };
    }

    if (this.isManifestStale(manifest)) {
      return {
        trailer_number: trailerNumber,
        reason: 'INCOMPLETE_MANIFEST',
        validation_errors: ['Manifest data is stale (older than threshold)'],
        instructions: 'Manifest is outdated. Scan each pallet/parcel to confirm current load.',
      };
    }

    // Should not reach here if calling after arriveTrailer returned manual
    return {
      trailer_number: trailerNumber,
      reason: 'USER_OVERRIDE',
      validation_errors: [],
      instructions: 'Manual scan mode. Scan each pallet/parcel individually.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIVATE: Auto-arrival flow
  // ═══════════════════════════════════════════════════════════════════

  private async performAutoArrival(
    request: ArriveTrailerRequest,
    manifest: TrailerManifest,
    trailerId: string,
  ): Promise<ArriveTrailerResponse> {

    // ── Push all freight to WMS as RECEIVED_ON_DOCK ─────────────────
    const wmsItems: WmsReceiptItem[] = manifest.packages.map(pkg => ({
      tracking_id: pkg.tracking_id,
      type: pkg.type,
      status: PackageStatus.RECEIVED_ON_DOCK,
      trailer_number: manifest.trailer_number,
      door_id: request.door_id ?? null,
      facility_id: request.facility_id,
      po_number: pkg.po_number ?? null,
      received_by_user_id: request.user_id,
      received_at: new Date(),
      weight_lbs: pkg.weight_lbs,
      sku_count: pkg.sku_count,
    }));

    const wmsRequest: WmsBatchReceiptRequest = {
      manifest_id: manifest.id,
      trailer_number: manifest.trailer_number,
      facility_id: request.facility_id,
      door_id: request.door_id ?? null,
      received_by_user_id: request.user_id,
      items: wmsItems,
    };

    const wmsResponse = await this.wmsAdapter.receiveBatch(wmsRequest);

    // ── Create audit record ─────────────────────────────────────────
    const audit = await this.auditRepo.create({
      trailer_id: trailerId,
      manifest_id: manifest.id,
      receive_method: ReceiveMethod.TMS_AUTO_ARRIVAL,
      source_system: manifest.source,
      arrived_by_user_id: request.user_id,
      facility_id: request.facility_id,
      door_id: request.door_id ?? null,
      package_count: manifest.package_count,
      pallet_count: manifest.pallet_count,
      override_reason: null,
      notes: request.notes ?? null,
    });

    // ── Publish arrival event ───────────────────────────────────────
    if (this.eventPublisher) {
      await this.eventPublisher.publish({
        event_type: 'INBOUND_TRAILER_ARRIVED',
        arrival_id: audit.id,
        trailer_number: manifest.trailer_number,
        receive_method: ReceiveMethod.TMS_AUTO_ARRIVAL,
        package_count: manifest.package_count,
        pallet_count: manifest.pallet_count,
        facility_id: request.facility_id,
        door_id: request.door_id ?? null,
        arrived_at: audit.arrived_at.toISOString(),
        source_system: manifest.source,
      });
    }

    // ── Return success response ─────────────────────────────────────
    const wmsReceiptIds = wmsResponse.confirmations
      .filter(c => !c.error)
      .map(c => c.wms_receipt_id);

    return {
      success: true,
      arrival_id: audit.id,
      trailer_number: manifest.trailer_number,
      receive_method: ReceiveMethod.TMS_AUTO_ARRIVAL,
      source_system: manifest.source,
      package_count: manifest.package_count,
      pallet_count: manifest.pallet_count,
      manifest_valid: true,
      manifest_errors: [],
      wms_receipt_ids: wmsReceiptIds,
      already_arrived: false,
      arrived_at: audit.arrived_at.toISOString(),
      message: `Trailer ${manifest.trailer_number} arrived via TMS. ${manifest.package_count} packages and ${manifest.pallet_count} pallets received on dock.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIVATE: Manual scan fallback
  // ═══════════════════════════════════════════════════════════════════

  private async performManualFallback(
    request: ArriveTrailerRequest,
    manifest: TrailerManifest | null,
    trailerId: string,
  ): Promise<ArriveTrailerResponse> {

    // Determine override reason
    let overrideReason: string;
    let manifestErrors: string[] = [];

    if (!manifest) {
      overrideReason = request.override_reason ?? 'No manifest found in TMS or local records';
    } else if (!manifest.is_validated) {
      overrideReason = request.override_reason ?? 'Manifest failed validation';
      manifestErrors = manifest.validation_errors.map(e => e.message);
    } else if (this.isManifestStale(manifest)) {
      overrideReason = request.override_reason ?? 'Manifest data is stale';
      manifestErrors = ['Manifest received_at exceeds staleness threshold'];
    } else {
      overrideReason = request.override_reason ?? 'User-initiated manual override';
    }

    // ── Create audit record (NO WMS push — manual scan does that) ───
    const audit = await this.auditRepo.create({
      trailer_id: trailerId,
      manifest_id: manifest?.id ?? null,
      receive_method: ReceiveMethod.MANUAL_SCAN_OVERRIDE,
      source_system: manifest?.source ?? 'MANUAL_ENTRY',
      arrived_by_user_id: request.user_id,
      facility_id: request.facility_id,
      door_id: request.door_id ?? null,
      package_count: 0,   // Will be updated as scans happen
      pallet_count: 0,
      override_reason: overrideReason,
      notes: request.notes ?? null,
    });

    // ── Publish event (even for manual — supervisors need visibility) ─
    if (this.eventPublisher) {
      await this.eventPublisher.publish({
        event_type: 'INBOUND_TRAILER_ARRIVED',
        arrival_id: audit.id,
        trailer_number: request.trailer_number,
        receive_method: ReceiveMethod.MANUAL_SCAN_OVERRIDE,
        package_count: 0,
        pallet_count: 0,
        facility_id: request.facility_id,
        door_id: request.door_id ?? null,
        arrived_at: audit.arrived_at.toISOString(),
        source_system: manifest?.source ?? 'MANUAL_ENTRY',
      });
    }

    return {
      success: true,
      arrival_id: audit.id,
      trailer_number: request.trailer_number,
      receive_method: ReceiveMethod.MANUAL_SCAN_OVERRIDE,
      source_system: manifest?.source ?? 'MANUAL_ENTRY',
      package_count: 0,
      pallet_count: 0,
      manifest_valid: false,
      manifest_errors: manifestErrors,
      wms_receipt_ids: [],
      already_arrived: false,
      arrived_at: audit.arrived_at.toISOString(),
      message: `Manual scan required for trailer ${request.trailer_number}. Reason: ${overrideReason}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIVATE: Helpers
  // ═══════════════════════════════════════════════════════════════════

  private async queryTms(request: ArriveTrailerRequest): Promise<TmsLookupResult> {
    try {
      return await this.tmsAdapter.lookupTrailer({
        trailer_number: request.trailer_number,
        truck_id: request.truck_id,
        carrier_code: request.carrier_code,
        shipper_id: request.shipper_id,
      });
    } catch (err) {
      // TMS errors should not crash the arrival flow
      console.error(`[TrailerArrivalService] TMS lookup failed for ${request.trailer_number}:`, err);
      return {
        found: false,
        data: null,
        source: ManifestSource.MANUAL_ENTRY,
        lookup_duration_ms: 0,
        error: err instanceof Error ? err.message : 'Unknown TMS error',
      };
    }
  }

  /**
   * Resolve a trailer_number to a stable trailer ID.
   * In production, this would query a trailer registry table.
   * For now, we use a deterministic UUID-like hash.
   */
  private resolveTrailerId(trailerNumber: string): string {
    // Simple deterministic ID from trailer number.
    // Replace with actual trailer registry lookup in production.
    return `trailer:${trailerNumber}`;
  }

  /**
   * Check if an existing arrival is recent enough to be considered
   * "already arrived" for idempotency purposes.
   * Default window: 24 hours.
   */
  private isRecentArrival(arrival: TrailerArrivalAudit): boolean {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return arrival.arrived_at > twentyFourHoursAgo;
  }

  /**
   * Check if a manifest is too old to be trusted.
   */
  private isManifestStale(manifest: TrailerManifest): boolean {
    const age = Date.now() - manifest.received_at.getTime();
    return age > this.config.manifestStalenessThresholdMs;
  }

  /**
   * Build a response for an idempotent duplicate arrival attempt.
   */
  private buildIdempotentResponse(existing: TrailerArrivalAudit): ArriveTrailerResponse {
    return {
      success: true,
      arrival_id: existing.id,
      trailer_number: existing.trailer_id.replace('trailer:', ''),
      receive_method: existing.receive_method,
      source_system: existing.source_system,
      package_count: existing.package_count,
      pallet_count: existing.pallet_count,
      manifest_valid: existing.receive_method === ReceiveMethod.TMS_AUTO_ARRIVAL,
      manifest_errors: [],
      wms_receipt_ids: [],
      already_arrived: true,
      arrived_at: existing.arrived_at.toISOString(),
      message: `Trailer already arrived at ${existing.arrived_at.toISOString()}. No duplicate action taken.`,
    };
  }
}
