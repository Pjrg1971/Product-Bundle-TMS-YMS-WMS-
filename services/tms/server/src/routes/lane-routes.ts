import express from "express";
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
  InMemoryGeoFenceEventRepository,
  LaneDashboardBuilder,
  TenderLaneMatchService,
} from "../repositories/lane-repositories";

export function buildLaneRouter(deps: {
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
  geoFenceEventRepo: InMemoryGeoFenceEventRepository;
}) {
  const router = express.Router();

  const dashboardBuilder = new LaneDashboardBuilder(
    deps.laneMasterRepo,
    deps.locationRepo,
    deps.laneScheduleRepo,
    deps.laneTimingRepo,
    deps.laneCarrierRepo,
    deps.laneCarrierAssignmentRepo,
    deps.laneRateRepo,
    deps.laneSlaRepo
  );

  const matchService = new TenderLaneMatchService(
    deps.laneMasterRepo,
    deps.laneCarrierAssignmentRepo,
    deps.laneRateRepo,
    deps.laneSlaRepo,
    deps.laneScheduleRepo
  );

  // ── Lane Dashboard (denormalized view) ──────────────────────────────────
  router.get("/api/ui/lanes/dashboard", (_req, res) => {
    try {
      const rows = dashboardBuilder.buildDashboard();

      // KPI summary
      const totalLanes = rows.length;
      const activeLanes = rows.filter((r) => r.status === "Active").length;
      const fmLanes = rows.filter((r) => r.mileType === "FM").length;
      const mmLanes = rows.filter((r) => r.mileType === "MM").length;

      res.status(200).json({
        cards: [
          { label: "Total Lanes", count: totalLanes },
          { label: "Active Lanes", count: activeLanes },
          { label: "First Mile", count: fmLanes },
          { label: "Middle Mile", count: mmLanes },
        ],
        lanes: rows,
      });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // ── Locations ───────────────────────────────────────────────────────────
  router.get("/api/ui/lanes/locations", (_req, res) => {
    try {
      const locations = deps.locationRepo.findAll();
      res.status(200).json(locations);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // ── Lane Carriers (carrier list) ────────────────────────────────────────
  router.get("/api/ui/lanes/carriers", (_req, res) => {
    try {
      const carriers = deps.laneCarrierRepo.findAll();
      res.status(200).json(carriers);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // ── Lane Carrier Assignments ────────────────────────────────────────────
  router.get("/api/ui/lanes/carrier-assignments", (_req, res) => {
    try {
      const assignments = deps.laneCarrierAssignmentRepo.findAll();
      const carriers = deps.laneCarrierRepo.findAll();
      const lanes = deps.laneMasterRepo.findAll();
      const locations = deps.locationRepo.findAll();

      const mapped = assignments.map((a) => {
        const carrier = carriers.find((c) => c.carrierId === a.carrierId);
        const lane = lanes.find((l) => l.laneId === a.laneId);
        const origin = lane
          ? locations.find((loc) => loc.locationId === lane.originLocationId)
          : undefined;
        const dest = lane
          ? locations.find((loc) => loc.locationId === lane.destLocationId)
          : undefined;

        return {
          ...a,
          carrierName: carrier?.carrierName ?? a.carrierId,
          laneMileType: lane?.mileType ?? "",
          originName: origin?.name ?? lane?.originLocationId ?? "",
          destName: dest?.name ?? lane?.destLocationId ?? "",
        };
      });

      res.status(200).json(mapped);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // ── Rate Card ───────────────────────────────────────────────────────────
  router.get("/api/ui/lanes/rates", (_req, res) => {
    try {
      const rates = deps.laneRateRepo.findAll();
      const carriers = deps.laneCarrierRepo.findAll();
      const lanes = deps.laneMasterRepo.findAll();
      const locations = deps.locationRepo.findAll();

      const mapped = rates.map((r) => {
        const carrier = carriers.find((c) => c.carrierId === r.carrierId);
        const lane = lanes.find((l) => l.laneId === r.laneId);
        const origin = lane
          ? locations.find((loc) => loc.locationId === lane.originLocationId)
          : undefined;
        const dest = lane
          ? locations.find((loc) => loc.locationId === lane.destLocationId)
          : undefined;

        return {
          ...r,
          carrierName: carrier?.carrierName ?? r.carrierId,
          originName: origin?.name ?? "",
          destName: dest?.name ?? "",
        };
      });

      res.status(200).json(mapped);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // ── SLA & Compliance ───────────────────────────────────────────────────
  router.get("/api/ui/lanes/sla", (_req, res) => {
    try {
      const slas = deps.laneSlaRepo.findAll();
      const lanes = deps.laneMasterRepo.findAll();
      const locations = deps.locationRepo.findAll();

      const mapped = slas.map((s) => {
        const lane = lanes.find((l) => l.laneId === s.laneId);
        const origin = lane
          ? locations.find((loc) => loc.locationId === lane.originLocationId)
          : undefined;
        const dest = lane
          ? locations.find((loc) => loc.locationId === lane.destLocationId)
          : undefined;

        return {
          ...s,
          originName: origin?.name ?? "",
          destName: dest?.name ?? "",
          mileType: lane?.mileType ?? "",
        };
      });

      res.status(200).json(mapped);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // ── Reference Config ───────────────────────────────────────────────────
  router.get("/api/ui/lanes/reference-config", (_req, res) => {
    try {
      const types = deps.referenceConfigRepo.allTypes();
      const grouped: Record<string, { code: string; displayName: string; sortOrder: number }[]> = {};
      for (const t of types) {
        grouped[t] = deps.referenceConfigRepo.findByType(t).map((r) => ({
          code: r.code,
          displayName: r.displayName,
          sortOrder: r.sortOrder,
        }));
      }
      res.status(200).json(grouped);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // ── Tender Lane Match ──────────────────────────────────────────────────
  router.post("/api/ui/lanes/match-tender", (req, res) => {
    try {
      const candidates = matchService.matchTender(req.body);
      res.status(200).json({ success: true, candidates });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // ── Live Map Data ──────────────────────────────────────────────────────
  router.get("/api/ui/lanes/live-map", (_req, res) => {
    try {
      const positions = deps.liveAssetPositionRepo.allLatest();
      const assets = Array.from(deps.liveAssetRepo.items.values());
      const lanes = deps.laneMasterRepo.findAll();
      const locations = deps.locationRepo.findAll();
      const carriers = deps.laneCarrierRepo.findAll();

      const mapped = positions.map((pos) => {
        const asset = assets.find((a) => a.assetId === pos.assetId);
        const lane = pos.laneId
          ? lanes.find((l) => l.laneId === pos.laneId)
          : undefined;
        const origin = lane
          ? locations.find((loc) => loc.locationId === lane.originLocationId)
          : undefined;
        const dest = lane
          ? locations.find((loc) => loc.locationId === lane.destLocationId)
          : undefined;
        const carrier = asset?.carrierId
          ? carriers.find((c) => c.carrierId === asset.carrierId)
          : undefined;

        return {
          positionId: pos.positionId,
          assetId: pos.assetId,
          assetType: asset?.assetType ?? "TRUCK",
          truckId: asset?.truckId,
          trailerId: asset?.trailerId,
          driverId: asset?.driverId,
          carrierId: asset?.carrierId,
          carrierName: carrier?.carrierName,
          laneId: pos.laneId,
          originName: origin?.name,
          destName: dest?.name,
          latitude: pos.latitude,
          longitude: pos.longitude,
          speedMph: pos.speedMph,
          headingDegrees: pos.headingDegrees,
          recordedAt: pos.recordedAt,
          status: asset?.status,
        };
      });

      // Geofences for the map
      const geofences = deps.geoFenceRepo.findActive().map((f) => ({
        geoFenceId: f.geoFenceId,
        name: f.name,
        fenceType: f.fenceType,
        latitude: f.centerLat,
        longitude: f.centerLng,
        radiusMeters: f.radiusMeters,
      }));

      // Location markers
      const locationMarkers = locations
        .filter((l) => l.latitude && l.longitude)
        .map((l) => ({
          locationId: l.locationId,
          name: l.name,
          locationType: l.locationType,
          latitude: l.latitude,
          longitude: l.longitude,
          city: l.city,
          state: l.state,
        }));

      res.status(200).json({
        assets: mapped,
        geofences,
        locations: locationMarkers,
      });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // ── Lane Schedules ─────────────────────────────────────────────────────
  router.get("/api/ui/lanes/schedules", (_req, res) => {
    try {
      const lanes = deps.laneMasterRepo.findAll();
      const locations = deps.locationRepo.findAll();
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      const mapped = lanes.map((lane) => {
        const origin = locations.find(
          (l) => l.locationId === lane.originLocationId
        );
        const dest = locations.find(
          (l) => l.locationId === lane.destLocationId
        );
        const schedules = deps.laneScheduleRepo.findByLane(lane.laneId);
        const timing = deps.laneTimingRepo.findDefaultForLane(lane.laneId);

        const schedule: Record<string, boolean> = {};
        dayNames.forEach((day, i) => {
          const s = schedules.find((sc) => sc.dayOfWeek === i + 1);
          schedule[day] = s ? s.isActive : false;
        });

        return {
          laneId: lane.laneId,
          mileType: lane.mileType,
          originName: origin?.name ?? lane.originLocationId,
          destName: dest?.name ?? lane.destLocationId,
          schedule,
          aptTime: timing?.aptTime,
          cptTime: timing?.cptTime,
          cetTime: timing?.cetTime,
          aptCptOffsetMin: timing?.aptCptOffsetMin,
        };
      });

      res.status(200).json(mapped);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  return router;
}
