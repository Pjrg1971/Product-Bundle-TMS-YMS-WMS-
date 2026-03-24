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
  GeoFenceEvent,
  LaneDashboardRow,
  TenderLaneCandidate,
} from "../types/lanes";

export class InMemoryLocationRepository {
  items = new Map<string, LocationRecord>();

  upsert(row: LocationRecord): void {
    this.items.set(row.locationId, row);
  }

  findAll(): LocationRecord[] {
    return Array.from(this.items.values());
  }

  findById(id: string): LocationRecord | undefined {
    return this.items.get(id);
  }
}

export class InMemoryLaneMasterRepository {
  items = new Map<string, LaneMaster>();

  upsert(row: LaneMaster): void {
    this.items.set(row.laneId, row);
  }

  findAll(): LaneMaster[] {
    return Array.from(this.items.values());
  }

  findById(id: string): LaneMaster | undefined {
    return this.items.get(id);
  }
}

export class InMemoryLaneScheduleRepository {
  items: LaneSchedule[] = [];

  replaceAll(rows: LaneSchedule[]): void {
    this.items = rows;
  }

  findByLane(laneId: string): LaneSchedule[] {
    return this.items.filter((s) => s.laneId === laneId);
  }
}

export class InMemoryLaneTimingRepository {
  items = new Map<string, LaneTiming>();

  upsert(row: LaneTiming): void {
    this.items.set(row.laneTimingId, row);
  }

  findByLane(laneId: string): LaneTiming[] {
    return Array.from(this.items.values()).filter((t) => t.laneId === laneId);
  }

  findDefaultForLane(laneId: string): LaneTiming | undefined {
    return Array.from(this.items.values()).find(
      (t) => t.laneId === laneId && t.dayOfWeek == null
    );
  }
}

export class InMemoryLaneCarrierRepository {
  items = new Map<string, LaneCarrier>();

  upsert(row: LaneCarrier): void {
    this.items.set(row.carrierId, row);
  }

  findAll(): LaneCarrier[] {
    return Array.from(this.items.values());
  }

  findById(id: string): LaneCarrier | undefined {
    return this.items.get(id);
  }
}

export class InMemoryLaneCarrierAssignmentRepository {
  items = new Map<string, LaneCarrierAssignment>();

  upsert(row: LaneCarrierAssignment): void {
    this.items.set(row.laneCarrierId, row);
  }

  findAll(): LaneCarrierAssignment[] {
    return Array.from(this.items.values());
  }

  findByLane(laneId: string): LaneCarrierAssignment[] {
    return Array.from(this.items.values()).filter((a) => a.laneId === laneId);
  }

  findPrimaryForLane(laneId: string): LaneCarrierAssignment | undefined {
    return Array.from(this.items.values()).find(
      (a) =>
        a.laneId === laneId &&
        (a.priority === "Primary" || a.priority === "PRIMARY")
    );
  }
}

export class InMemoryLaneRateRepository {
  items = new Map<string, LaneRate>();

  upsert(row: LaneRate): void {
    this.items.set(row.rateId, row);
  }

  findAll(): LaneRate[] {
    return Array.from(this.items.values());
  }

  findByLaneAndCarrier(laneId: string, carrierId: string): LaneRate[] {
    return Array.from(this.items.values()).filter(
      (r) => r.laneId === laneId && r.carrierId === carrierId
    );
  }

  findCurrentForLaneCarrier(
    laneId: string,
    carrierId: string
  ): LaneRate | undefined {
    return Array.from(this.items.values()).find(
      (r) =>
        r.laneId === laneId &&
        r.carrierId === carrierId &&
        r.isCurrent !== false
    );
  }
}

export class InMemoryLaneSlaRepository {
  items = new Map<string, LaneSla>();

  upsert(row: LaneSla): void {
    this.items.set(row.slaId, row);
  }

  findAll(): LaneSla[] {
    return Array.from(this.items.values());
  }

  findByLane(laneId: string): LaneSla | undefined {
    return Array.from(this.items.values()).find((s) => s.laneId === laneId);
  }
}

export class InMemoryReferenceConfigRepository {
  items: ReferenceConfig[] = [];

  replaceAll(rows: ReferenceConfig[]): void {
    this.items = rows;
  }

  findByType(configType: string): ReferenceConfig[] {
    return this.items
      .filter((r) => r.configType === configType)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  allTypes(): string[] {
    return [...new Set(this.items.map((r) => r.configType))].sort();
  }
}

export class InMemoryLiveAssetRepository {
  items = new Map<string, LiveAsset>();

  upsert(row: LiveAsset): void {
    this.items.set(row.assetId, row);
  }

  findAll(): LiveAsset[] {
    return Array.from(this.items.values());
  }
}

export class InMemoryLiveAssetPositionRepository {
  items: LiveAssetPosition[] = [];

  add(row: LiveAssetPosition): void {
    this.items.push(row);
  }

  latestByAsset(assetId: string): LiveAssetPosition | undefined {
    return this.items
      .filter((p) => p.assetId === assetId)
      .sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      )[0];
  }

  allLatest(): LiveAssetPosition[] {
    const byAsset = new Map<string, LiveAssetPosition>();
    for (const p of this.items) {
      const existing = byAsset.get(p.assetId);
      if (
        !existing ||
        new Date(p.recordedAt).getTime() >
          new Date(existing.recordedAt).getTime()
      ) {
        byAsset.set(p.assetId, p);
      }
    }
    return Array.from(byAsset.values());
  }
}

export class InMemoryGeoFenceRepository {
  items = new Map<string, GeoFence>();

  upsert(row: GeoFence): void {
    this.items.set(row.geoFenceId, row);
  }

  findActive(): GeoFence[] {
    return Array.from(this.items.values()).filter((f) => f.isActive);
  }

  findByLane(laneId: string): GeoFence[] {
    return Array.from(this.items.values()).filter(
      (f) => f.laneId === laneId && f.isActive
    );
  }
}

export class InMemoryGeoFenceEventRepository {
  items: GeoFenceEvent[] = [];

  add(row: GeoFenceEvent): void {
    this.items.push(row);
  }

  lastEventForAssetFence(
    assetId: string,
    geoFenceId: string
  ): GeoFenceEvent | undefined {
    return this.items
      .filter((e) => e.assetId === assetId && e.geoFenceId === geoFenceId)
      .sort(
        (a, b) =>
          new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime()
      )[0];
  }
}

// ── Lane Dashboard Builder ───────────────────────────────────────────────────

export class LaneDashboardBuilder {
  constructor(
    private laneRepo: InMemoryLaneMasterRepository,
    private locationRepo: InMemoryLocationRepository,
    private scheduleRepo: InMemoryLaneScheduleRepository,
    private timingRepo: InMemoryLaneTimingRepository,
    private carrierRepo: InMemoryLaneCarrierRepository,
    private assignmentRepo: InMemoryLaneCarrierAssignmentRepository,
    private rateRepo: InMemoryLaneRateRepository,
    private slaRepo: InMemoryLaneSlaRepository
  ) {}

  buildDashboard(): LaneDashboardRow[] {
    const lanes = this.laneRepo.findAll();
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return lanes.map((lane) => {
      const origin = this.locationRepo.findById(lane.originLocationId);
      const dest = this.locationRepo.findById(lane.destLocationId);
      const schedules = this.scheduleRepo.findByLane(lane.laneId);
      const timing = this.timingRepo.findDefaultForLane(lane.laneId);
      const primaryAssignment = this.assignmentRepo.findPrimaryForLane(
        lane.laneId
      );
      const primaryCarrier = primaryAssignment
        ? this.carrierRepo.findById(primaryAssignment.carrierId)
        : undefined;
      const rate =
        primaryAssignment && primaryCarrier
          ? this.rateRepo.findCurrentForLaneCarrier(
              lane.laneId,
              primaryCarrier.carrierId
            )
          : undefined;
      const sla = this.slaRepo.findByLane(lane.laneId);

      const schedule: Record<string, boolean> = {};
      dayNames.forEach((day, i) => {
        const s = schedules.find((sc) => sc.dayOfWeek === i + 1);
        schedule[day] = s ? s.isActive : false;
      });

      return {
        laneId: lane.laneId,
        mileType: lane.mileType,
        status: lane.status,
        originName: origin?.name ?? lane.originLocationId,
        originCity: origin?.city,
        originState: origin?.state,
        destName: dest?.name ?? lane.destLocationId,
        destCity: dest?.city,
        destState: dest?.state,
        schedule,
        aptTime: timing?.aptTime,
        cptTime: timing?.cptTime,
        cetTime: timing?.cetTime,
        primaryCarrier: primaryCarrier?.carrierName,
        equipmentType: primaryAssignment?.equipmentType,
        rateLoad: rate?.rateLoad,
        rateType: rate?.rateType,
        otTarget: sla?.otTarget,
        dwellLimitMin: sla?.dwellLimitMin,
        laneOwner: sla?.laneOwner,
        transitHours: lane.transitHours,
        distanceMiles: lane.distanceMiles,
      };
    });
  }
}

// ── Tender Lane Match Service (in-memory) ────────────────────────────────────

export class TenderLaneMatchService {
  constructor(
    private laneRepo: InMemoryLaneMasterRepository,
    private assignmentRepo: InMemoryLaneCarrierAssignmentRepository,
    private rateRepo: InMemoryLaneRateRepository,
    private slaRepo: InMemoryLaneSlaRepository,
    private scheduleRepo: InMemoryLaneScheduleRepository
  ) {}

  matchTender(input: {
    originLocationId?: string | null;
    destLocationId?: string | null;
    mileType?: string | null;
    carrierId?: string | null;
    equipmentType?: string | null;
    tenderDate?: string | null;
  }): TenderLaneCandidate[] {
    const lanes = this.laneRepo.findAll();
    const tenderDate = input.tenderDate
      ? new Date(input.tenderDate)
      : undefined;
    const dayOfWeek = tenderDate ? ((tenderDate.getDay() + 6) % 7) + 1 : null; // Mon=1

    const candidates: TenderLaneCandidate[] = [];

    for (const lane of lanes) {
      const matchedOnOrigin = input.originLocationId
        ? lane.originLocationId === input.originLocationId
        : false;
      const matchedOnDestination = input.destLocationId
        ? lane.destLocationId === input.destLocationId
        : false;
      const matchedOnMileType = input.mileType
        ? lane.mileType === input.mileType
        : false;

      // Find matching lane carrier
      const assignments = this.assignmentRepo.findByLane(lane.laneId);
      let bestAssignment: import("../types/lanes").LaneCarrierAssignment | undefined = assignments[0];
      let matchedOnEquipment = false;

      if (input.carrierId) {
        bestAssignment = assignments.find(
          (a) => a.carrierId === input.carrierId
        );
      }
      if (bestAssignment && input.equipmentType) {
        matchedOnEquipment =
          bestAssignment.equipmentType === input.equipmentType;
      }

      // Check schedule
      let matchedOnSchedule = false;
      if (dayOfWeek) {
        const schedules = this.scheduleRepo.findByLane(lane.laneId);
        const daySchedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
        matchedOnSchedule = daySchedule?.isActive ?? false;
      }

      // Check rate window
      let matchedOnRateWindow = true;
      if (bestAssignment && tenderDate) {
        const rates = this.rateRepo.findByLaneAndCarrier(
          lane.laneId,
          bestAssignment.carrierId
        );
        const activeRate = rates.find((r) => {
          if (r.effectiveDate && new Date(r.effectiveDate) > tenderDate)
            return false;
          if (r.expirationDate && new Date(r.expirationDate) < tenderDate)
            return false;
          return true;
        });
        matchedOnRateWindow = !!activeRate;
      }

      // Check SLA window
      let matchedOnSlaWindow = true;
      if (tenderDate) {
        const sla = this.slaRepo.findByLane(lane.laneId);
        if (sla) {
          if (sla.effectiveDate && new Date(sla.effectiveDate) > tenderDate)
            matchedOnSlaWindow = false;
          if (sla.expirationDate && new Date(sla.expirationDate) < tenderDate)
            matchedOnSlaWindow = false;
        }
      }

      // Only include if at least origin or destination matches
      if (!matchedOnOrigin && !matchedOnDestination) continue;

      let score = 0;
      const explanation: string[] = [];

      if (matchedOnOrigin) {
        score += 30;
        explanation.push("origin matched");
      }
      if (matchedOnDestination) {
        score += 30;
        explanation.push("destination matched");
      }
      if (matchedOnMileType) {
        score += 15;
        explanation.push("mile type matched");
      }
      if (matchedOnEquipment) {
        score += 10;
        explanation.push("equipment matched");
      }
      if (matchedOnSchedule) {
        score += 5;
        explanation.push("schedule matched");
      }
      if (matchedOnRateWindow) {
        score += 10;
        explanation.push("rate window matched");
      }
      if (matchedOnSlaWindow) {
        score += 5;
        explanation.push("SLA window matched");
      }

      candidates.push({
        laneId: lane.laneId,
        laneCarrierId: bestAssignment?.laneCarrierId,
        carrierId: bestAssignment?.carrierId,
        rateId: bestAssignment
          ? this.rateRepo.findCurrentForLaneCarrier(
              lane.laneId,
              bestAssignment.carrierId
            )?.rateId
          : undefined,
        matchScore: score,
        matchedOnOrigin,
        matchedOnDestination,
        matchedOnMileType,
        matchedOnEquipment,
        matchedOnSchedule,
        matchedOnRateWindow,
        matchedOnSlaWindow,
        selected: false,
        explanation,
      });
    }

    candidates.sort((a, b) => b.matchScore - a.matchScore);
    if (candidates[0]) candidates[0].selected = true;
    return candidates;
  }
}
