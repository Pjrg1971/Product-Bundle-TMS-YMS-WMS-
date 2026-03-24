/**
 * WmsAdapter — Interface for pushing received freight into WMS.
 *
 * When a trailer is auto-arrived via TMS, all packages/pallets from the
 * manifest are pushed into WMS with status = RECEIVED_ON_DOCK.
 *
 * The WMS adapter is responsible for:
 *   1. Creating receipt records for each package/pallet
 *   2. Updating inventory visibility
 *   3. Triggering putaway tasks (if WMS supports it)
 *   4. Returning confirmation IDs for audit
 *
 * Implementations should be created per WMS:
 *   - SupabaseWmsAdapter (Radixx built-in WMS tables)
 *   - ManhattanWmsAdapter
 *   - BlueYonderWmsAdapter
 *   - GenericWmsApiAdapter (for REST-based WMS systems)
 *
 * IMPORTANT: The WMS adapter should NOT be called for manual scan
 * overrides. Manual scans push freight into WMS one-at-a-time as
 * the dock worker scans each unit.
 */

import { ManifestPackage, PackageStatus } from '../models';

// ─── A single freight unit to receive into WMS ─────────────────────
export interface WmsReceiptItem {
  tracking_id: string;            // Barcode / tracking number
  type: 'PARCEL' | 'PALLET';
  status: PackageStatus;          // Should be RECEIVED_ON_DOCK
  trailer_number: string;
  door_id: string | null;
  facility_id: string;
  po_number: string | null;
  received_by_user_id: string;
  received_at: Date;
  weight_lbs?: number;
  sku_count?: number;
}

// ─── Batch receipt request ──────────────────────────────────────────
export interface WmsBatchReceiptRequest {
  manifest_id: string;             // Link back to the manifest
  trailer_number: string;
  facility_id: string;
  door_id: string | null;
  received_by_user_id: string;
  items: WmsReceiptItem[];
}

// ─── Receipt confirmation for a single item ─────────────────────────
export interface WmsReceiptConfirmation {
  tracking_id: string;
  wms_receipt_id: string;          // WMS's internal receipt ID
  status: PackageStatus;
  received_at: Date;
  error?: string;                  // Null if successful
}

// ─── Batch receipt response ─────────────────────────────────────────
export interface WmsBatchReceiptResponse {
  success: boolean;                // True if ALL items were received
  total_submitted: number;
  total_received: number;
  total_failed: number;
  confirmations: WmsReceiptConfirmation[];
  errors: string[];                // Aggregate error messages
}

// ─── The adapter interface ──────────────────────────────────────────
export interface IWmsAdapter {
  /**
   * Human-readable name of this WMS system.
   */
  readonly systemName: string;

  /**
   * Receive an entire trailer's freight into WMS in one batch.
   *
   * This is the core method called during TMS_AUTO_ARRIVAL.
   * All packages from the validated manifest are pushed to WMS
   * with status = RECEIVED_ON_DOCK.
   *
   * Implementations should:
   *   - Be transactional (all-or-nothing, or report partial failures)
   *   - Be idempotent (same tracking_id received twice = no duplicate)
   *   - Return confirmation IDs for each item
   *   - Never throw — always return a WmsBatchReceiptResponse
   */
  receiveBatch(request: WmsBatchReceiptRequest): Promise<WmsBatchReceiptResponse>;

  /**
   * Check if a specific tracking ID has already been received.
   * Used for idempotency checks before batch receipt.
   */
  isAlreadyReceived(trackingId: string, facilityId: string): Promise<boolean>;

  /**
   * Health check — can we reach the WMS system?
   */
  healthCheck(): Promise<{ healthy: boolean; latency_ms: number }>;
}
