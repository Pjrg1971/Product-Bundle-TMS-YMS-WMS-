/**
 * TmsAdapter — Interface for pulling trailer/shipment data from TMS providers.
 *
 * The YMS does not own shipment data. It queries external TMS systems
 * (or middleware like Shippo, Shipium, ShipStation) to get the manifest
 * for an inbound trailer.
 *
 * Integration flow:
 *   1. User scans trailer number at dock
 *   2. YMS calls TmsAdapter.lookupTrailer() with trailer identifiers
 *   3. TMS returns manifest data (packages, pallets, POs, carrier info)
 *   4. YMS validates the manifest
 *   5. If valid → auto-arrive. If not → manual scan fallback.
 *
 * Implementations should be created per provider:
 *   - ShippoTmsAdapter
 *   - ShipiumTmsAdapter
 *   - ShipStationTmsAdapter
 *   - EdiTmsAdapter (for EDI 204/856/214 feeds)
 *   - DirectApiTmsAdapter (for shipper-hosted APIs)
 */

import { ManifestPackage, ManifestSource } from '../models';

// ─── Lookup parameters sent to TMS ─────────────────────────────────
export interface TmsLookupParams {
  trailer_number: string;
  truck_id?: string;
  carrier_code?: string;
  shipper_id?: string;
  po_numbers?: string[];           // Optional: filter by specific POs
  asn_reference?: string;          // Optional: ASN/manifest reference number
}

// ─── What TMS returns ───────────────────────────────────────────────
export interface TmsTrailerData {
  trailer_number: string;
  truck_id: string | null;
  carrier_code: string | null;
  carrier_name: string | null;
  shipper_id: string | null;
  shipper_name: string | null;
  source: ManifestSource;          // Which TMS/provider sourced this
  po_numbers: string[];
  estimated_arrival?: Date;        // ETA from TMS
  packages: ManifestPackage[];
  package_count: number;
  pallet_count: number;
  raw_payload?: unknown;           // Original TMS response for debugging
}

// ─── Lookup result wrapper ──────────────────────────────────────────
export interface TmsLookupResult {
  found: boolean;                  // Did TMS have data for this trailer?
  data: TmsTrailerData | null;     // Null if not found
  source: ManifestSource;          // Which provider was queried
  lookup_duration_ms: number;      // How long the TMS call took
  error?: string;                  // Error message if the call failed
}

// ─── The adapter interface ──────────────────────────────────────────
export interface ITmsAdapter {
  /**
   * Human-readable name of this TMS provider.
   * Used in audit records and error messages.
   */
  readonly providerName: string;

  /**
   * The ManifestSource enum value for this adapter.
   */
  readonly source: ManifestSource;

  /**
   * Query the TMS for trailer and shipment data.
   *
   * Implementations should:
   *   - Make the external API call (HTTP, SFTP, message queue, etc.)
   *   - Normalize the response into TmsTrailerData
   *   - Return found=false if the trailer is not in the TMS
   *   - Return error string if the call itself failed (timeout, auth, etc.)
   *   - Never throw — always return a TmsLookupResult
   */
  lookupTrailer(params: TmsLookupParams): Promise<TmsLookupResult>;

  /**
   * Health check — can we reach this TMS provider?
   */
  healthCheck(): Promise<{ healthy: boolean; latency_ms: number }>;
}

// ─── Composite adapter that tries multiple providers ────────────────
/**
 * CompositeTmsAdapter — Queries multiple TMS providers in priority order.
 *
 * When a trailer arrives, we don't always know which TMS has the data.
 * This adapter tries each registered provider until one returns a match.
 *
 * Priority order is configurable per facility/tenant.
 */
export interface ICompositeTmsAdapter {
  /**
   * Register a TMS adapter with a priority (lower = tried first).
   */
  registerAdapter(adapter: ITmsAdapter, priority: number): void;

  /**
   * Try all registered adapters in priority order.
   * Returns the first successful match, or a combined "not found" result.
   */
  lookupTrailer(params: TmsLookupParams): Promise<TmsLookupResult>;
}
