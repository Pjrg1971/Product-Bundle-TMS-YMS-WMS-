/**
 * ShipmentFeedAdapter — Interface for ingesting shipment feeds.
 *
 * Unlike the TmsAdapter (pull-based, on-demand), the ShipmentFeedAdapter
 * handles push-based feeds: EDI files, webhook payloads, and scheduled
 * API polling from shippers or middleware providers.
 *
 * Flow:
 *   1. Shipper/middleware sends data (EDI file, webhook, API push)
 *   2. ShipmentFeedAdapter normalizes it into a CreateManifestInput
 *   3. ManifestValidationService validates the data
 *   4. ManifestRepository persists the validated (or invalid) manifest
 *   5. When the trailer actually arrives, the manifest is already waiting
 *
 * This decouples "receiving manifest data" from "arriving the trailer".
 * Manifests can arrive hours or days before the physical trailer.
 */

import { CreateManifestInput, ManifestSource } from '../models';

// ─── Raw feed payload (provider-specific) ───────────────────────────
export interface RawShipmentFeed {
  source: ManifestSource;
  received_at: Date;
  content_type: 'EDI' | 'JSON' | 'XML' | 'CSV';
  raw_payload: string | Buffer;
  metadata?: Record<string, unknown>;  // Provider-specific headers, etc.
}

// ─── Parsed feed result ─────────────────────────────────────────────
export interface ParsedShipmentFeed {
  success: boolean;
  manifests: CreateManifestInput[];    // One feed may contain multiple trailers
  errors: string[];
  source: ManifestSource;
  parse_duration_ms: number;
}

// ─── The adapter interface ──────────────────────────────────────────
export interface IShipmentFeedAdapter {
  /**
   * Which sources this adapter can parse.
   */
  readonly supportedSources: ManifestSource[];

  /**
   * Parse a raw shipment feed into normalized manifest inputs.
   *
   * Implementations should:
   *   - Handle the specific format (EDI X12 856, JSON webhook, etc.)
   *   - Extract trailer_number, packages, POs, carrier info
   *   - Return multiple manifests if the feed covers multiple trailers
   *   - Never throw — return errors in the ParsedShipmentFeed
   */
  parse(feed: RawShipmentFeed): Promise<ParsedShipmentFeed>;

  /**
   * Validate that a raw payload looks like a valid feed from this source.
   * Quick check before attempting full parse (schema validation, header check, etc.)
   */
  canParse(feed: RawShipmentFeed): boolean;
}
