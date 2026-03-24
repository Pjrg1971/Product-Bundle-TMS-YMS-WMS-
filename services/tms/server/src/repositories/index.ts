export * from './in-memory';
export * from './lane-repositories';
export * from './postgres';
export * from './pg-lane-repositories';

import { Pool } from 'pg';

import {
  PgRawTransmissionRepository,
  PgCanonicalTenderRepository,
  PgCanonicalStatusRepository,
  PgCanonicalInvoiceRepository,
  PgTenderRepository,
  PgTrackingEventRepository,
  PgMilestoneRepository,
  PgExceptionRepository,
  PgInvoiceRepository,
  PgShipmentRepository,
  PgLoadRepository,
  PgFacilityRepository,
  PgTradingPartnerRepository,
  PgExpectedChargeRepository,
  PgRoutePlanRepository,
  PgOpsDashboardQueryRepository,
  PgTrackingQueryRepository,
} from './postgres';

import {
  PgLocationRepository,
  PgLaneMasterRepository,
  PgLaneScheduleRepository,
  PgLaneTimingRepository,
  PgLaneCarrierRepository,
  PgLaneCarrierAssignmentRepository,
  PgLaneRateRepository,
  PgLaneSlaRepository,
  PgReferenceConfigRepository,
  PgLiveAssetRepository,
  PgLiveAssetPositionRepository,
  PgGeoFenceRepository,
  PgGeoFenceEventRepository,
} from './pg-lane-repositories';

export function createPgRepositories(pool: Pool) {
  return {
    rawTransmission: new PgRawTransmissionRepository(pool),
    canonicalTender: new PgCanonicalTenderRepository(pool),
    canonicalStatus: new PgCanonicalStatusRepository(pool),
    canonicalInvoice: new PgCanonicalInvoiceRepository(pool),
    tender: new PgTenderRepository(pool),
    trackingEvent: new PgTrackingEventRepository(pool),
    milestone: new PgMilestoneRepository(pool),
    exception: new PgExceptionRepository(pool),
    invoice: new PgInvoiceRepository(pool),
    shipment: new PgShipmentRepository(pool),
    load: new PgLoadRepository(pool),
    facility: new PgFacilityRepository(pool),
    tradingPartner: new PgTradingPartnerRepository(pool),
    expectedCharge: new PgExpectedChargeRepository(pool),
    routePlan: new PgRoutePlanRepository(pool),
    opsDashboard: new PgOpsDashboardQueryRepository(pool),
    trackingQuery: new PgTrackingQueryRepository(pool),
    location: new PgLocationRepository(pool),
    laneMaster: new PgLaneMasterRepository(pool),
    laneSchedule: new PgLaneScheduleRepository(pool),
    laneTiming: new PgLaneTimingRepository(pool),
    laneCarrier: new PgLaneCarrierRepository(pool),
    laneCarrierAssignment: new PgLaneCarrierAssignmentRepository(pool),
    laneRate: new PgLaneRateRepository(pool),
    laneSla: new PgLaneSlaRepository(pool),
    referenceConfig: new PgReferenceConfigRepository(pool),
    liveAsset: new PgLiveAssetRepository(pool),
    liveAssetPosition: new PgLiveAssetPositionRepository(pool),
    geoFence: new PgGeoFenceRepository(pool),
    geoFenceEvent: new PgGeoFenceEventRepository(pool),
  };
}
