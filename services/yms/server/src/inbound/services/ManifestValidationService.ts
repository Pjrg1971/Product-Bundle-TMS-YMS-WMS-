/**
 * ManifestValidationService — Validates inbound trailer manifests.
 *
 * A manifest must pass ALL validation rules before auto-arrival is allowed.
 * If any rule fails, the manifest is marked as invalid and the dock worker
 * is forced into the manual scan fallback workflow.
 *
 * Validation rules:
 *   1. trailer_number is present and non-empty
 *   2. source is a recognized ManifestSource
 *   3. At least one package OR pallet is declared (package_count + pallet_count > 0)
 *   4. Every package has a non-empty tracking_id
 *   5. No duplicate tracking_ids within the same manifest
 *   6. If packages reference POs, po_numbers array must contain those POs
 *   7. package_count matches actual packages array length
 *   8. pallet_count matches count of type=PALLET in packages array
 */

import {
  TrailerManifest,
  ManifestPackage,
  ManifestValidationError,
  ManifestSource,
} from '../models';

export class ManifestValidationService {

  /**
   * Validate a manifest and return the list of errors (empty = valid).
   */
  validate(manifest: Partial<TrailerManifest>): ManifestValidationError[] {
    const errors: ManifestValidationError[] = [];

    // Rule 1: trailer_number required
    if (!manifest.trailer_number || manifest.trailer_number.trim() === '') {
      errors.push({
        field: 'trailer_number',
        code: 'REQUIRED',
        message: 'Trailer number is required',
      });
    }

    // Rule 2: source must be recognized
    if (!manifest.source || !Object.values(ManifestSource).includes(manifest.source)) {
      errors.push({
        field: 'source',
        code: 'INVALID_SOURCE',
        message: `Unrecognized manifest source: ${manifest.source}`,
      });
    }

    const packages = manifest.packages ?? [];
    const packageCount = manifest.package_count ?? 0;
    const palletCount = manifest.pallet_count ?? 0;

    // Rule 3: at least one freight unit declared
    if (packageCount + palletCount === 0 && packages.length === 0) {
      errors.push({
        field: 'package_count',
        code: 'EMPTY_MANIFEST',
        message: 'Manifest must declare at least one package or pallet',
      });
    }

    // Rule 4: every package needs a tracking_id
    const emptyTrackingIds = packages.filter(
      (p: ManifestPackage) => !p.tracking_id || p.tracking_id.trim() === ''
    );
    if (emptyTrackingIds.length > 0) {
      errors.push({
        field: 'packages[].tracking_id',
        code: 'MISSING_TRACKING_ID',
        message: `${emptyTrackingIds.length} package(s) have missing tracking IDs`,
      });
    }

    // Rule 5: no duplicate tracking_ids
    const trackingIds = packages.map((p: ManifestPackage) => p.tracking_id).filter(Boolean);
    const duplicates = trackingIds.filter(
      (id: string, idx: number) => trackingIds.indexOf(id) !== idx
    );
    if (duplicates.length > 0) {
      errors.push({
        field: 'packages[].tracking_id',
        code: 'DUPLICATE_TRACKING_ID',
        message: `Duplicate tracking IDs found: ${[...new Set(duplicates)].join(', ')}`,
      });
    }

    // Rule 6: PO cross-reference
    const packagePOs = new Set(
      packages.map((p: ManifestPackage) => p.po_number).filter(Boolean) as string[]
    );
    const declaredPOs = new Set(manifest.po_numbers ?? []);
    const missingPOs = [...packagePOs].filter(po => !declaredPOs.has(po));
    if (missingPOs.length > 0) {
      errors.push({
        field: 'po_numbers',
        code: 'MISSING_PO_REFERENCE',
        message: `Packages reference POs not listed in manifest: ${missingPOs.join(', ')}`,
      });
    }

    // Rule 7: package_count matches array length (if both provided)
    if (packages.length > 0 && packageCount > 0 && packages.length !== packageCount) {
      errors.push({
        field: 'package_count',
        code: 'COUNT_MISMATCH',
        message: `Declared package_count (${packageCount}) does not match packages array length (${packages.length})`,
      });
    }

    // Rule 8: pallet_count matches PALLET-type entries
    if (packages.length > 0 && palletCount > 0) {
      const actualPallets = packages.filter((p: ManifestPackage) => p.type === 'PALLET').length;
      if (actualPallets !== palletCount) {
        errors.push({
          field: 'pallet_count',
          code: 'PALLET_COUNT_MISMATCH',
          message: `Declared pallet_count (${palletCount}) does not match PALLET entries (${actualPallets})`,
        });
      }
    }

    return errors;
  }

  /**
   * Convenience: returns true if the manifest passes all validation rules.
   */
  isValid(manifest: Partial<TrailerManifest>): boolean {
    return this.validate(manifest).length === 0;
  }

  /**
   * Validate and return a structured result with the manifest marked up.
   */
  validateAndMark(manifest: Partial<TrailerManifest>): {
    is_validated: boolean;
    validation_errors: ManifestValidationError[];
  } {
    const validation_errors = this.validate(manifest);
    return {
      is_validated: validation_errors.length === 0,
      validation_errors,
    };
  }
}
