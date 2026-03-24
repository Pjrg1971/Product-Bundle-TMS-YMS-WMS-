/**
 * TrailerManifest — Domain model for inbound trailer manifest data.
 *
 * A manifest represents the expected freight on a trailer, pulled from
 * TMS/EDI/API sources. It is the single source of truth for whether
 * auto-arrival is allowed.
 *
 * Validation rules:
 *   1. trailer_number is required and non-empty
 *   2. At least one package OR one pallet must be declared
 *   3. source must be a recognized ManifestSource
 *   4. packages array must not contain duplicates (by tracking_id)
 *   5. po_numbers must not be empty if packages reference POs
 */

import { ManifestSource } from './ReceiveMethod';

// ─── Package line item within a manifest ────────────────────────────
export interface ManifestPackage {
  tracking_id: string;       // Unique parcel/pallet barcode
  type: 'PARCEL' | 'PALLET'; // What kind of freight unit
  weight_lbs?: number;
  dimensions?: {
    length_in: number;
    width_in: number;
    height_in: number;
  };
  po_number?: string;        // Purchase order this package fulfills
  sku_count?: number;        // Number of SKUs on this pallet/in this parcel
  hazmat?: boolean;          // Hazardous material flag
}

// ─── Validation error detail ────────────────────────────────────────
export interface ManifestValidationError {
  field: string;
  code: string;
  message: string;
}

// ─── Core manifest model ────────────────────────────────────────────
export interface TrailerManifest {
  id: string;                          // UUID
  trailer_number: string;              // e.g. "TRL-88215"
  truck_id: string | null;             // Tractor/truck identifier
  carrier_code: string | null;         // SCAC or carrier ID
  shipper_id: string | null;           // Shipper account identifier
  source: ManifestSource;              // Where this manifest came from
  received_at: Date;                   // When we received the manifest data
  is_validated: boolean;               // Did it pass all validation rules?
  validation_errors: ManifestValidationError[]; // Why it failed, if it did
  po_numbers: string[];                // All POs referenced in this load
  package_count: number;               // Total parcels expected
  pallet_count: number;                // Total pallets expected
  packages: ManifestPackage[];         // Line-item detail for each unit
}

// ─── Create/insert DTO ──────────────────────────────────────────────
export interface CreateManifestInput {
  trailer_number: string;
  truck_id?: string;
  carrier_code?: string;
  shipper_id?: string;
  source: ManifestSource;
  po_numbers?: string[];
  packages: ManifestPackage[];
}
