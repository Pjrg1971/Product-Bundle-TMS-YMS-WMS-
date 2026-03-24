import * as XLSX from "xlsx";
import crypto from "node:crypto";
import type {
  LocationRecord,
  LaneMaster,
  LaneSchedule,
  LaneTiming,
  LaneCarrier,
  LaneCarrierAssignment,
  LaneRate,
  LaneSla,
  ReferenceConfig,
  LiveAsset,
  LiveAssetPosition,
  GeoFence,
} from "../types/lanes";
import {
  InMemoryLocationRepository,
  InMemoryLaneMasterRepository,
  InMemoryLaneScheduleRepository,
  InMemoryLaneTimingRepository,
  InMemoryLaneCarrierRepository,
  InMemoryLaneCarrierAssignmentRepository,
  InMemoryLaneRateRepository,
  InMemoryLaneSlaRepository,
  InMemoryReferenceConfigRepository,
  InMemoryLiveAssetRepository,
  InMemoryLiveAssetPositionRepository,
  InMemoryGeoFenceRepository,
} from "../repositories/lane-repositories";

const dayMap: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
};

function normalizeHeader(input: string): string {
  return input
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\(lookup\)/gi, "")
    .replace(/\[.*?\]/g, "")
    .trim();
}

function sheetToObjects(sheet: XLSX.WorkSheet, headerRowNumber: number, dataStartRowNumber: number): Record<string, unknown>[] {
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1, raw: true, defval: null,
  });

  const headerRow = rows[headerRowNumber - 1] ?? [];
  const headers = headerRow.map((h) => normalizeHeader(String(h ?? "")));

  const objects: Record<string, unknown>[] = [];
  for (let i = dataStartRowNumber - 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (!Array.isArray(row)) continue;
    const hasAny = row.some((v) => v !== null && v !== "");
    if (!hasAny) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      obj[h] = row[idx] ?? null;
    });
    objects.push(obj);
  }
  return objects;
}

function toNullableString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[$,%\s,]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseBool01(value: unknown): boolean {
  return value === 1 || value === "1" || value === true || String(value).toUpperCase() === "TRUE";
}

function parseExcelDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString().slice(0, 10);
  }
  const maybe = new Date(String(value));
  return Number.isNaN(maybe.getTime()) ? null : maybe.toISOString().slice(0, 10);
}

function parseExcelTime(value: unknown): string | null {
  if (value == null || value === "" || value === "N/A") return null;
  if (value instanceof Date) return value.toISOString().slice(11, 19);
  if (typeof value === "number") {
    const totalSeconds = Math.round(value * 24 * 60 * 60);
    const hh = String(Math.floor(totalSeconds / 3600) % 24).padStart(2, "0");
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const ss = String(totalSeconds % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  const asString = String(value).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(asString)) {
    return asString.length === 5 ? `${asString}:00` : asString;
  }
  return null;
}

function slugifyConfigType(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export interface LaneRepositories {
  locationRepo: InMemoryLocationRepository;
  laneMasterRepo: InMemoryLaneMasterRepository;
  laneScheduleRepo: InMemoryLaneScheduleRepository;
  laneTimingRepo: InMemoryLaneTimingRepository;
  laneCarrierRepo: InMemoryLaneCarrierRepository;
  laneCarrierAssignmentRepo: InMemoryLaneCarrierAssignmentRepository;
  laneRateRepo: InMemoryLaneRateRepository;
  laneSlaRepo: InMemoryLaneSlaRepository;
  referenceConfigRepo: InMemoryReferenceConfigRepository;
  liveAssetRepo: InMemoryLiveAssetRepository;
  liveAssetPositionRepo: InMemoryLiveAssetPositionRepository;
  geoFenceRepo: InMemoryGeoFenceRepository;
}

export function seedFromWorkbook(filePath: string, repos: LaneRepositories): void {
  console.log(`[lane-seed] Loading workbook: ${filePath}`);
  const wb = XLSX.readFile(filePath, { cellDates: true });

  // ── Locations ──
  const locSheet = wb.Sheets["Locations"];
  if (locSheet) {
    const rows = sheetToObjects(locSheet, 3, 4);
    for (const r of rows) {
      const locationId = String(r["location_id"] ?? "").trim();
      if (!locationId) continue;
      repos.locationRepo.upsert({
        locationId,
        name: String(r["Name"] ?? "").trim(),
        streetAddress: toNullableString(r["Street Address"]),
        city: toNullableString(r["City"]),
        state: toNullableString(r["State"]),
        zip: r["ZIP"] == null ? null : String(r["ZIP"]),
        locationType: toNullableString(r["Location Type"]),
        notes: toNullableString(r["Notes"]),
        latitude: parseNumber(r["Latitude"]),
        longitude: parseNumber(r["Longitude"]),
      });
    }
    console.log(`[lane-seed] Loaded ${repos.locationRepo.items.size} locations`);
  }

  // ── Carriers ──
  const carrSheet = wb.Sheets["Carriers"];
  if (carrSheet) {
    const rows = sheetToObjects(carrSheet, 3, 4);
    for (const r of rows) {
      const carrierId = String(r["carrier_id"] ?? "").trim();
      if (!carrierId) continue;
      repos.laneCarrierRepo.upsert({
        carrierId,
        carrierName: String(r["Carrier Name"] ?? "").trim(),
        scac: toNullableString(r["SCAC"]),
        mcNumber: toNullableString(r["MC Number"]),
        dotNumber: toNullableString(r["DOT Number"]),
        insuranceExpiry: parseExcelDate(r["Insurance Expiry"]),
        status: toNullableString(r["Status"]),
        notes: toNullableString(r["Notes"]),
      });
    }
    console.log(`[lane-seed] Loaded ${repos.laneCarrierRepo.items.size} carriers`);
  }

  // ── Lanes Master ──
  const laneSheet = wb.Sheets["Lanes Master"];
  if (laneSheet) {
    const rows = sheetToObjects(laneSheet, 3, 4);
    for (const r of rows) {
      const laneId = String(r["lane_id"] ?? "").trim();
      if (!laneId) continue;
      repos.laneMasterRepo.upsert({
        laneId,
        mileType: String(r["Mile Type"] ?? "").trim(),
        originLocationId: String(r["origin_location_id"] ?? "").trim(),
        destLocationId: String(r["dest_location_id"] ?? "").trim(),
        transitHours: parseNumber(r["Transit (hrs)"]),
        distanceMiles: parseNumber(r["Distance (mi)"]),
        status: toNullableString(r["Status"]),
      });
    }
    console.log(`[lane-seed] Loaded ${repos.laneMasterRepo.items.size} lanes`);
  }

  // ── Pickup Schedule ──
  const schedSheet = wb.Sheets["Pickup Schedule"];
  if (schedSheet) {
    const rows = sheetToObjects(schedSheet, 3, 4);
    const schedules: LaneSchedule[] = [];
    for (const r of rows) {
      const laneId = String(r["lane_id"] ?? "").trim();
      if (!laneId) continue;
      Object.entries(dayMap).forEach(([day, dow]) => {
        schedules.push({
          laneScheduleId: crypto.randomUUID(),
          laneId,
          dayOfWeek: dow,
          isActive: parseBool01(r[day]),
        });
      });
    }
    repos.laneScheduleRepo.replaceAll(schedules);
    console.log(`[lane-seed] Loaded ${schedules.length} schedule entries`);
  }

  // ── Timing Windows ──
  const timingSheet = wb.Sheets["Timing Windows"];
  if (timingSheet) {
    const rows = sheetToObjects(timingSheet, 3, 4);
    let count = 0;
    for (const r of rows) {
      const laneId = String(r["lane_id"] ?? "").trim();
      if (!laneId) continue;
      repos.laneTimingRepo.upsert({
        laneTimingId: crypto.randomUUID(),
        laneId,
        mileType: toNullableString(r["Mile Type"]),
        dayOfWeek: null,
        aptTime: parseExcelTime(r["APT"]),
        cptTime: parseExcelTime(r["CPT (APT + 45 min)"]),
        cetTime: parseExcelTime(r["CET"]),
        aptCptOffsetMin: parseNumber(r["APT-CPT Offset (min)"]),
      });
      count++;
    }
    console.log(`[lane-seed] Loaded ${count} timing windows`);
  }

  // ── Lane Carriers (assignments) ──
  const lcSheet = wb.Sheets["Lane Carriers"];
  if (lcSheet) {
    const rows = sheetToObjects(lcSheet, 3, 4);
    for (const r of rows) {
      const laneCarrierId = String(r["lane_carrier_id"] ?? "").trim();
      if (!laneCarrierId) continue;
      repos.laneCarrierAssignmentRepo.upsert({
        laneCarrierId,
        laneId: String(r["lane_id"] ?? "").trim(),
        carrierId: String(r["carrier_id"] ?? "").trim(),
        equipmentType: toNullableString(r["Equipment Type"]),
        trailerSize: toNullableString(r["Trailer Size"]),
        loadType: toNullableString(r["Load Type"]),
        maxWeightLbs: parseNumber(r["Max Weight (lbs)"]),
        maxPallets: parseNumber(r["Max Pallets"]),
        tempRange: toNullableString(r["Temp Range (°F)"]),
        priority: toNullableString(r["Priority"]),
      });
    }
    console.log(`[lane-seed] Loaded ${repos.laneCarrierAssignmentRepo.items.size} lane carrier assignments`);
  }

  // ── Rate Card ──
  const rateSheet = wb.Sheets["Rate Card"];
  if (rateSheet) {
    const rows = sheetToObjects(rateSheet, 3, 4);
    for (const r of rows) {
      const rateId = String(r["rate_id"] ?? "").trim();
      if (!rateId) continue;
      repos.laneRateRepo.upsert({
        rateId,
        laneId: String(r["lane_id"] ?? "").trim(),
        carrierId: String(r["carrier_id"] ?? "").trim(),
        rateLoad: parseNumber(r["Rate / Load ($)"]),
        rateMile: parseNumber(r["Rate / Mile ($)"]),
        fuelSurchargePct: parseNumber(r["Fuel Surcharge (%)"]),
        accessorials: parseNumber(r["Accessorials ($)"]),
        rateType: toNullableString(r["Rate Type"]),
        effectiveDate: parseExcelDate(r["Effective Date"]),
        expirationDate: parseExcelDate(r["Expiration Date"]),
        version: parseNumber(r["Version"]),
        isCurrent: r["Is Current"] == null ? null : parseBool01(r["Is Current"]),
      });
    }
    console.log(`[lane-seed] Loaded ${repos.laneRateRepo.items.size} rates`);
  }

  // ── SLA & Compliance ──
  const slaSheet = wb.Sheets["SLA & Compliance"];
  if (slaSheet) {
    const rows = sheetToObjects(slaSheet, 3, 4);
    for (const r of rows) {
      const slaId = String(r["sla_id"] ?? "").trim();
      if (!slaId) continue;
      repos.laneSlaRepo.upsert({
        slaId,
        laneId: String(r["lane_id"] ?? "").trim(),
        otTarget: parseNumber(r["OT% Target"]),
        dwellLimitMin: parseNumber(r["Dwell Limit (min)"]),
        effectiveDate: parseExcelDate(r["Effective Date"]),
        expirationDate: parseExcelDate(r["Expiration Date"]),
        laneOwner: toNullableString(r["Lane Owner"]),
        notes: toNullableString(r["Notes"]),
      });
    }
    console.log(`[lane-seed] Loaded ${repos.laneSlaRepo.items.size} SLAs`);
  }

  // ── Reference Config (multi-block parser) ──
  const refSheet = wb.Sheets["Reference Config"];
  if (refSheet) {
    const arr = XLSX.utils.sheet_to_json<(string | null)[]>(refSheet, {
      header: 1, raw: false, defval: null,
    });

    const pairs = [
      { codeCol: 0, displayCol: 1 },
      { codeCol: 3, displayCol: 4 },
      { codeCol: 6, displayCol: 7 },
    ];

    const configs: ReferenceConfig[] = [];
    pairs.forEach(({ codeCol, displayCol }) => {
      let currentSection: string | null = null;
      let sortOrder = 0;

      for (let i = 2; i < arr.length; i++) {
        const row = arr[i] ?? [];
        const left = row[codeCol] ? String(row[codeCol]).trim() : "";
        const right = row[displayCol] ? String(row[displayCol]).trim() : "";

        if (left && !right && !/^Code$/i.test(left)) {
          currentSection = left;
          sortOrder = 0;
          continue;
        }
        if (/^Code$/i.test(left) && /^Display Name$/i.test(right)) continue;
        if (!currentSection || !left || !right) continue;

        sortOrder += 1;
        configs.push({
          referenceConfigId: crypto.randomUUID(),
          configType: slugifyConfigType(currentSection),
          code: left,
          displayName: right,
          sortOrder,
          isActive: true,
        });
      }
    });
    repos.referenceConfigRepo.replaceAll(configs);
    console.log(`[lane-seed] Loaded ${configs.length} reference configs`);
  }

  // ── Seed demo live assets and geofences from locations ──
  seedLiveAssets(repos);
  seedGeoFences(repos);

  console.log(`[lane-seed] Workbook import complete`);
}

// Demo city coordinates for locations without lat/lng
const CITY_COORDS: Record<string, [number, number]> = {
  "Dallas": [32.7767, -96.7970],
  "Austin": [30.2672, -97.7431],
  "Houston": [29.7604, -95.3698],
  "Phoenix": [33.4484, -112.0740],
  "Los Angeles": [34.0522, -118.2437],
  "Long Beach": [33.7701, -118.1937],
  "New York": [40.7128, -74.0060],
  "Sacramento": [38.5816, -121.4944],
  "Fort Worth": [32.7555, -97.3308],
  "San Antonio": [29.4241, -98.4936],
  "Elk Grove": [38.4088, -121.3716],
  "Compton": [33.8958, -118.2201],
  "Troutdale": [45.5393, -122.3871],
  "Newark": [40.7357, -74.1724],
  "Goodyear": [33.4353, -112.3577],
};

function seedLiveAssets(repos: LaneRepositories): void {
  // First, backfill lat/lng on locations from city names for demo purposes
  for (const loc of repos.locationRepo.findAll()) {
    if (!loc.latitude && loc.city) {
      const coords = CITY_COORDS[loc.city];
      if (coords) {
        loc.latitude = coords[0] + (Math.random() - 0.5) * 0.05;
        loc.longitude = coords[1] + (Math.random() - 0.5) * 0.05;
      }
    }
  }

  const carriers = repos.laneCarrierRepo.findAll();
  const lanes = repos.laneMasterRepo.findAll();
  let assetCount = 0;
  const statuses = ["IN_TRANSIT", "IN_TRANSIT", "IN_TRANSIT", "IDLE", "STOPPED"];

  // Create one truck per carrier for demo
  for (const carrier of carriers.slice(0, 5)) {
    const assetId = crypto.randomUUID();
    repos.liveAssetRepo.upsert({
      assetId,
      assetType: "TRUCK",
      carrierId: carrier.carrierId,
      truckId: `TRK-${carrier.carrierId.toUpperCase().slice(0, 4)}-${String(assetCount + 1).padStart(2, "0")}`,
      trailerId: `TRL-${String(assetCount + 1).padStart(3, "0")}`,
      driverId: `DRV-${String(assetCount + 1).padStart(3, "0")}`,
      status: statuses[assetCount % statuses.length],
    });

    // Place them somewhere along a lane
    if (lanes[assetCount]) {
      const origin = repos.locationRepo.findById(lanes[assetCount].originLocationId);
      const dest = repos.locationRepo.findById(lanes[assetCount].destLocationId);
      if (origin?.latitude && origin?.longitude && dest?.latitude && dest?.longitude) {
        // Place at random point between origin and dest
        const t = 0.2 + Math.random() * 0.6;
        const lat = origin.latitude + (dest.latitude - origin.latitude) * t;
        const lng = origin.longitude + (dest.longitude - origin.longitude) * t;
        repos.liveAssetPositionRepo.add({
          positionId: crypto.randomUUID(),
          assetId,
          laneId: lanes[assetCount].laneId,
          latitude: lat,
          longitude: lng,
          speedMph: 45 + Math.random() * 25,
          headingDegrees: Math.random() * 360,
          recordedAt: new Date().toISOString(),
        });
      }
    }
    assetCount++;
  }
  console.log(`[lane-seed] Created ${assetCount} demo live assets`);
}

function seedGeoFences(repos: LaneRepositories): void {
  const locations = repos.locationRepo.findAll();
  let count = 0;
  for (const loc of locations) {
    if (loc.latitude && loc.longitude) {
      repos.geoFenceRepo.upsert({
        geoFenceId: crypto.randomUUID(),
        locationId: loc.locationId,
        fenceType: loc.locationType?.includes("Sort") || loc.locationType?.includes("FC") ? "ORIGIN" : "DESTINATION",
        name: `${loc.name} Geofence`,
        radiusMeters: 500,
        centerLat: loc.latitude,
        centerLng: loc.longitude,
        isActive: true,
      });
      count++;
    }
  }
  console.log(`[lane-seed] Created ${count} geofences from locations`);
}
