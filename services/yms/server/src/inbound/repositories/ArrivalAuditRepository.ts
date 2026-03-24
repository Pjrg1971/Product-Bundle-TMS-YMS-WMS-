/**
 * ArrivalAuditRepository — Data access interface for trailer arrival audit records.
 *
 * Every trailer arrival (auto or manual) creates exactly one audit row.
 * The idempotency check uses this repository to detect duplicate arrivals.
 *
 * Implementations:
 *   - Supabase/PostgreSQL (production)
 *   - In-memory (testing)
 */

import { TrailerArrivalAudit, ReceiveMethod } from '../models';

export interface CreateArrivalAuditInput {
  trailer_id: string;
  manifest_id: string | null;
  receive_method: ReceiveMethod;
  source_system: string;
  arrived_by_user_id: string;
  facility_id: string;
  door_id: string | null;
  package_count: number;
  pallet_count: number;
  override_reason: string | null;
  notes: string | null;
}

export interface IArrivalAuditRepository {
  /**
   * Find the most recent arrival for a given trailer.
   * Used for idempotency: if an arrival already exists with
   * status = ARRIVED, we return it instead of creating a new one.
   */
  findLatestByTrailerId(trailerId: string): Promise<TrailerArrivalAudit | null>;

  /**
   * Find arrival by primary key.
   */
  findById(id: string): Promise<TrailerArrivalAudit | null>;

  /**
   * Create a new arrival audit record.
   * Returns the created record with generated ID and arrived_at timestamp.
   */
  create(input: CreateArrivalAuditInput): Promise<TrailerArrivalAudit>;

  /**
   * List all arrivals for a facility within a time range.
   * Used for reporting and audit review.
   */
  listByFacility(
    facilityId: string,
    fromDate: Date,
    toDate: Date,
    limit?: number
  ): Promise<TrailerArrivalAudit[]>;
}
