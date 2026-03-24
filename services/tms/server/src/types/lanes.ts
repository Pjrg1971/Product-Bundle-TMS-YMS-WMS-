// ── Lane Management Domain Types ─────────────────────────────────────────────

export type MileType = "FM" | "MM" | string;

export interface LocationRecord {
  locationId: string;
  name: string;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  locationType?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LaneMaster {
  laneId: string;
  mileType: string;
  originLocationId: string;
  destLocationId: string;
  transitHours?: number | null;
  distanceMiles?: number | null;
  status?: string | null;
}

export interface LaneSchedule {
  laneScheduleId: string;
  laneId: string;
  dayOfWeek: number; // 1=Mon ... 7=Sun
  isActive: boolean;
}

export interface LaneTiming {
  laneTimingId: string;
  laneId: string;
  mileType?: string | null;
  dayOfWeek?: number | null;
  aptTime?: string | null;
  cptTime?: string | null;
  cetTime?: string | null;
  aptCptOffsetMin?: number | null;
}

export interface LaneCarrier {
  carrierId: string;
  carrierName: string;
  scac?: string | null;
  mcNumber?: string | null;
  dotNumber?: string | null;
  insuranceExpiry?: string | null;
  status?: string | null;
  notes?: string | null;
}

export interface LaneCarrierAssignment {
  laneCarrierId: string;
  laneId: string;
  carrierId: string;
  equipmentType?: string | null;
  trailerSize?: string | null;
  loadType?: string | null;
  maxWeightLbs?: number | null;
  maxPallets?: number | null;
  tempRange?: string | null;
  priority?: string | null;
}

export interface LaneRate {
  rateId: string;
  laneId: string;
  carrierId: string;
  rateLoad?: number | null;
  rateMile?: number | null;
  fuelSurchargePct?: number | null;
  accessorials?: number | null;
  rateType?: string | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  version?: number | null;
  isCurrent?: boolean | null;
}

export interface LaneSla {
  slaId: string;
  laneId: string;
  otTarget?: number | null;
  dwellLimitMin?: number | null;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  laneOwner?: string | null;
  notes?: string | null;
}

export interface ReferenceConfig {
  referenceConfigId: string;
  configType: string;
  code: string;
  displayName: string;
  sortOrder: number;
  isActive: boolean;
}

export interface TenderLaneCandidate {
  laneId: string;
  laneCarrierId?: string | null;
  carrierId?: string | null;
  rateId?: string | null;
  matchScore: number;
  matchedOnOrigin: boolean;
  matchedOnDestination: boolean;
  matchedOnMileType: boolean;
  matchedOnEquipment: boolean;
  matchedOnSchedule: boolean;
  matchedOnRateWindow: boolean;
  matchedOnSlaWindow: boolean;
  selected: boolean;
  explanation: string[];
}

export interface LiveAsset {
  assetId: string;
  assetType: "TRUCK" | "TRAILER" | "DRIVER";
  carrierId?: string | null;
  truckId?: string | null;
  trailerId?: string | null;
  driverId?: string | null;
  status?: string | null;
}

export interface LiveAssetPosition {
  positionId: string;
  assetId: string;
  shipmentId?: string | null;
  loadId?: string | null;
  laneId?: string | null;
  latitude: number;
  longitude: number;
  speedMph?: number | null;
  headingDegrees?: number | null;
  recordedAt: string;
}

export interface GeoFence {
  geoFenceId: string;
  locationId?: string | null;
  laneId?: string | null;
  fenceType: "ORIGIN" | "DESTINATION" | "CHECKPOINT" | "CUSTOM";
  name: string;
  radiusMeters?: number | null;
  centerLat?: number | null;
  centerLng?: number | null;
  isActive: boolean;
}

export interface GeoFenceEvent {
  geoFenceEventId: string;
  geoFenceId: string;
  assetId: string;
  shipmentId?: string | null;
  loadId?: string | null;
  laneId?: string | null;
  eventType: "ENTER" | "EXIT" | "DWELL";
  eventAt: string;
}

// ── Lane Dashboard View (denormalized) ───────────────────────────────────────

export interface LaneDashboardRow {
  laneId: string;
  mileType: string;
  status?: string | null;
  originName: string;
  originCity?: string | null;
  originState?: string | null;
  destName: string;
  destCity?: string | null;
  destState?: string | null;
  schedule: Record<string, boolean>; // Mon-Sun
  aptTime?: string | null;
  cptTime?: string | null;
  cetTime?: string | null;
  primaryCarrier?: string | null;
  equipmentType?: string | null;
  rateLoad?: number | null;
  rateType?: string | null;
  otTarget?: number | null;
  dwellLimitMin?: number | null;
  laneOwner?: string | null;
  transitHours?: number | null;
  distanceMiles?: number | null;
}
