/**
 * TrailerArrival — Domain model for a trailer arrival event.
 *
 * Every time a user clicks "Arrive Trailer", an arrival record is
 * created. The arrival is idempotent: if a trailer has already been
 * arrived (status = ARRIVED), subsequent clicks return the existing
 * arrival record instead of creating a duplicate.
 *
 * The audit trail captures:
 *   - Who arrived the trailer (user ID)
 *   - When it happened
 *   - Which source system provided the manifest
 *   - How many packages/pallets were consumed
 *   - Whether it was auto-arrival or manual override
 *   - Override reason (if manual)
 */

import { ReceiveMethod } from './ReceiveMethod';

// ─── Core arrival audit model ───────────────────────────────────────
export interface TrailerArrivalAudit {
  id: string;                           // UUID
  trailer_id: string;                   // UUID → references the trailer entity
  manifest_id: string | null;           // UUID → trailer_manifest.id (null if manual)
  receive_method: ReceiveMethod;        // TMS_AUTO_ARRIVAL or MANUAL_SCAN_OVERRIDE
  source_system: string;                // e.g. "SHIPPO", "EDI_856", "MANUAL_ENTRY"
  arrived_by_user_id: string;           // Who clicked "Arrive Trailer"
  arrived_at: Date;                     // Timestamp of arrival
  facility_id: string;                  // Which facility/warehouse
  door_id: string | null;               // Which dock door (if known)
  package_count: number;                // Packages consumed into WMS
  pallet_count: number;                 // Pallets consumed into WMS
  override_reason: string | null;       // Required when receive_method = MANUAL_SCAN_OVERRIDE
  notes: string | null;                 // Optional freeform notes
}

// ─── Request DTO for arriving a trailer ─────────────────────────────
export interface ArriveTrailerRequest {
  trailer_number: string;               // Scanned or entered trailer ID
  truck_id?: string;                    // Optional tractor ID
  carrier_code?: string;                // Optional carrier SCAC
  shipper_id?: string;                  // Optional shipper filter
  facility_id: string;                  // Current facility
  door_id?: string;                     // Dock door (if docked)
  user_id: string;                      // Authenticated user
  override_reason?: string;             // Only if forcing manual override
  notes?: string;                       // Optional notes
}

// ─── Response DTO from arrival operation ────────────────────────────
export interface ArriveTrailerResponse {
  success: boolean;
  arrival_id: string;
  trailer_number: string;
  receive_method: ReceiveMethod;
  source_system: string;
  package_count: number;
  pallet_count: number;
  manifest_valid: boolean;
  manifest_errors: string[];            // Empty if valid
  wms_receipt_ids: string[];            // WMS confirmation IDs for received freight
  already_arrived: boolean;             // True if idempotent duplicate
  arrived_at: string;                   // ISO timestamp
  message: string;                      // Human-readable status message
}

// ─── Manual scan fallback context ───────────────────────────────────
export interface ManualScanContext {
  trailer_number: string;
  reason: 'NO_MANIFEST' | 'INVALID_MANIFEST' | 'INCOMPLETE_MANIFEST' | 'USER_OVERRIDE';
  validation_errors: string[];
  instructions: string;
}
