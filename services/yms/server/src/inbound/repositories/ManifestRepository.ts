/**
 * ManifestRepository — Data access interface for trailer manifests.
 *
 * Implementations should handle:
 *   - Supabase/PostgreSQL (production)
 *   - In-memory (testing)
 *
 * The lookup method uses a composite key strategy:
 *   1. Try exact match on trailer_number + truck_id + carrier_code
 *   2. Fall back to trailer_number only
 *   3. Optionally filter by shipper_id if provided
 *
 * This supports scenarios where the same trailer number may appear
 * across multiple carriers or shippers.
 */

import { TrailerManifest, CreateManifestInput } from '../models';

export interface ManifestLookupParams {
  trailer_number: string;
  truck_id?: string;
  carrier_code?: string;
  shipper_id?: string;
}

export interface IManifestRepository {
  /**
   * Find the most recent manifest matching the given trailer identifiers.
   * Returns null if no manifest exists for this trailer.
   */
  findByTrailer(params: ManifestLookupParams): Promise<TrailerManifest | null>;

  /**
   * Find a manifest by its primary key.
   */
  findById(id: string): Promise<TrailerManifest | null>;

  /**
   * Create a new manifest record from TMS/EDI/API ingest.
   * Returns the created manifest with generated ID.
   */
  create(input: CreateManifestInput & {
    is_validated: boolean;
    validation_errors: Array<{ field: string; code: string; message: string }>;
    package_count: number;
    pallet_count: number;
  }): Promise<TrailerManifest>;

  /**
   * Update validation status after re-validation.
   */
  updateValidation(
    id: string,
    is_validated: boolean,
    validation_errors: Array<{ field: string; code: string; message: string }>
  ): Promise<void>;
}
