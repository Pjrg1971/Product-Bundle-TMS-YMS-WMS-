import express from "express";
import cors from "cors";

import { UuidFactory, SystemClock } from "./types/ports";
import {
  NormalizationPipeline,
  Edi204Normalizer,
  Edi990Normalizer,
  Edi214Normalizer,
  Edi997Normalizer,
  Edi210Normalizer,
  ApiStatusWebhookNormalizer,
} from "./normalizers";
import { TenderService } from "./services/tender-service";
import { TrackingService, MilestoneMapper, TrackingTimelineService } from "./services/tracking-service";
import { ExceptionEngine, TenderRejectedRule, MissedPickupRule, LinehaulDelayRule } from "./services/exception-engine";
import { EtaService } from "./services/eta-service";
import { BillingService, InvoiceAuditService } from "./services/billing-service";
import { TransmissionIngestionService } from "./services/ingestion-service";
import { OpsDashboardService } from "./services/dashboard-service";
import { TmsOrchestratorService } from "./services/orchestrator";
import {
  InMemoryRawTransmissionRepository,
  InMemoryCanonicalTenderRepository,
  InMemoryCanonicalStatusRepository,
  InMemoryCanonicalInvoiceRepository,
  InMemoryTenderRepository,
  InMemoryTrackingEventRepository,
  InMemoryMilestoneRepository,
  InMemoryExceptionRepository,
  InMemoryInvoiceRepository,
  InMemoryShipmentCostRepository,
  InMemoryExpectedChargeRepository,
  InMemoryRoutePlanRepository,
  InMemoryShipmentRepository,
  InMemoryLoadRepository,
  InMemoryFacilityRepository,
  InMemoryTradingPartnerRepository,
  InMemoryOpsDashboardQueryRepository,
  InMemoryTrackingQueryRepository,
  StubEdiGateway,
  StubApiCarrierGateway,
} from "./repositories/in-memory";
import { buildTmsRouter } from "./routes/tms-routes";
import { buildUiRouter } from "./routes/ui-routes";
import { buildLaneRouter } from "./routes/lane-routes";
import { seedAllData } from "./seed/data";
import { seedFromWorkbook } from "./seed/lane-seed";
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
} from "./repositories/lane-repositories";
import path from "node:path";

function buildApp() {
  const ids = new UuidFactory();
  const clock = new SystemClock();

  // Repositories
  const rawTxRepo = new InMemoryRawTransmissionRepository();
  const canonicalTenderRepo = new InMemoryCanonicalTenderRepository();
  const canonicalStatusRepo = new InMemoryCanonicalStatusRepository();
  const canonicalInvoiceRepo = new InMemoryCanonicalInvoiceRepository();
  const tenderRepo = new InMemoryTenderRepository();
  const trackingRepo = new InMemoryTrackingEventRepository();
  const milestoneRepo = new InMemoryMilestoneRepository();
  const exceptionRepo = new InMemoryExceptionRepository();
  const invoiceRepo = new InMemoryInvoiceRepository();
  const shipmentCostRepo = new InMemoryShipmentCostRepository();
  const expectedChargeRepo = new InMemoryExpectedChargeRepository();
  const routePlanRepo = new InMemoryRoutePlanRepository();
  const shipmentRepo = new InMemoryShipmentRepository();
  const loadRepo = new InMemoryLoadRepository();
  const facilityRepo = new InMemoryFacilityRepository();
  const tradingPartnerRepo = new InMemoryTradingPartnerRepository();

  // Lane Management Repositories
  const locationRepo = new InMemoryLocationRepository();
  const laneMasterRepo = new InMemoryLaneMasterRepository();
  const laneScheduleRepo = new InMemoryLaneScheduleRepository();
  const laneTimingRepo = new InMemoryLaneTimingRepository();
  const laneCarrierRepo = new InMemoryLaneCarrierRepository();
  const laneCarrierAssignmentRepo = new InMemoryLaneCarrierAssignmentRepository();
  const laneRateRepo = new InMemoryLaneRateRepository();
  const laneSlaRepo = new InMemoryLaneSlaRepository();
  const referenceConfigRepo = new InMemoryReferenceConfigRepository();
  const liveAssetRepo = new InMemoryLiveAssetRepository();
  const liveAssetPositionRepo = new InMemoryLiveAssetPositionRepository();
  const geoFenceRepo = new InMemoryGeoFenceRepository();
  const geoFenceEventRepo = new InMemoryGeoFenceEventRepository();

  const opsRepo = new InMemoryOpsDashboardQueryRepository(
    tenderRepo,
    shipmentRepo,
    invoiceRepo,
    exceptionRepo,
    loadRepo,
    facilityRepo
  );
  const trackingQueryRepo = new InMemoryTrackingQueryRepository(trackingRepo, milestoneRepo, exceptionRepo);

  // Normalizers
  const normalizers = [
    new Edi204Normalizer(ids, clock),
    new Edi990Normalizer(ids, clock),
    new Edi214Normalizer(ids, clock),
    new Edi997Normalizer(ids, clock),
    new Edi210Normalizer(ids, clock),
    new ApiStatusWebhookNormalizer(ids, clock),
  ];

  const pipeline = new NormalizationPipeline(
    normalizers,
    canonicalTenderRepo,
    canonicalStatusRepo,
    canonicalInvoiceRepo,
    rawTxRepo,
    clock
  );

  // Services
  const ingestionService = new TransmissionIngestionService(rawTxRepo, pipeline, clock);
  const tenderService = new TenderService(tenderRepo, new StubEdiGateway(), new StubApiCarrierGateway(), clock);
  const milestoneMapper = new MilestoneMapper();
  const trackingService = new TrackingService(trackingRepo, milestoneRepo, milestoneMapper, ids);
  const exceptionEngine = new ExceptionEngine(exceptionRepo, [
    new TenderRejectedRule(clock),
    new MissedPickupRule(clock),
    new LinehaulDelayRule(clock),
  ]);
  const billingService = new BillingService(invoiceRepo, shipmentCostRepo);
  const invoiceAuditService = new InvoiceAuditService(expectedChargeRepo);
  const timelineService = new TrackingTimelineService(trackingQueryRepo);
  const etaService = new EtaService(routePlanRepo);
  const dashboardService = new OpsDashboardService(opsRepo);
  const orchestrator = new TmsOrchestratorService(ingestionService, trackingService, exceptionEngine);

  // Express app
  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json());

  // Mount routers
  app.use(buildTmsRouter(tenderService, trackingService, billingService));
  app.use(buildUiRouter(timelineService, dashboardService, shipmentRepo, tenderRepo, invoiceRepo, exceptionRepo, loadRepo, facilityRepo));
  app.use(buildLaneRouter({
    locationRepo, laneMasterRepo, laneScheduleRepo, laneTimingRepo,
    laneCarrierRepo, laneCarrierAssignmentRepo, laneRateRepo, laneSlaRepo,
    referenceConfigRepo, liveAssetRepo, liveAssetPositionRepo,
    geoFenceRepo, geoFenceEventRepo,
  }));

  // Orchestrator endpoints
  app.post("/api/raw-transmissions", async (req, res) => {
    try {
      await orchestrator.ingestRawTransmission(req.body);
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  app.post("/api/canonical-status/apply", async (req, res) => {
    try {
      await orchestrator.applyNormalizedStatusToTracking(req.body);
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  app.post("/api/invoice-audit", async (req, res) => {
    try {
      const result = await invoiceAuditService.audit(req.body);
      res.status(200).json({ success: true, result });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  app.post("/api/eta", async (req, res) => {
    try {
      const eta = await etaService.computeEta(req.body);
      res.status(200).json({ success: true, eta });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  return {
    app,
    repos: {
      rawTxRepo,
      canonicalTenderRepo,
      canonicalStatusRepo,
      canonicalInvoiceRepo,
      tenderRepo,
      trackingRepo,
      milestoneRepo,
      exceptionRepo,
      invoiceRepo,
      shipmentRepo,
      loadRepo,
      facilityRepo,
      tradingPartnerRepo,
      locationRepo,
      laneMasterRepo,
      laneScheduleRepo,
      laneTimingRepo,
      laneCarrierRepo,
      laneCarrierAssignmentRepo,
      laneRateRepo,
      laneSlaRepo,
      referenceConfigRepo,
      liveAssetRepo,
      liveAssetPositionRepo,
      geoFenceRepo,
      geoFenceEventRepo,
    },
    services: {
      ingestionService,
      tenderService,
      trackingService,
      exceptionEngine,
      billingService,
      invoiceAuditService,
      timelineService,
      etaService,
      dashboardService,
      orchestrator,
    },
  };
}

async function main() {
  const { app, repos } = buildApp();

  // Seed demo data
  await seedAllData({
    shipmentRepo: repos.shipmentRepo,
    loadRepo: repos.loadRepo,
    facilityRepo: repos.facilityRepo,
    tradingPartnerRepo: repos.tradingPartnerRepo,
    tenderRepo: repos.tenderRepo,
    trackingRepo: repos.trackingRepo,
    milestoneRepo: repos.milestoneRepo,
    exceptionRepo: repos.exceptionRepo,
    invoiceRepo: repos.invoiceRepo,
  });

  // Seed lane data from workbook
  const workbookPath = path.resolve(__dirname, "../../Lanes UI/Lanes UI.xlsx");
  try {
    seedFromWorkbook(workbookPath, {
      locationRepo: repos.locationRepo,
      laneMasterRepo: repos.laneMasterRepo,
      laneScheduleRepo: repos.laneScheduleRepo,
      laneTimingRepo: repos.laneTimingRepo,
      laneCarrierRepo: repos.laneCarrierRepo,
      laneCarrierAssignmentRepo: repos.laneCarrierAssignmentRepo,
      laneRateRepo: repos.laneRateRepo,
      laneSlaRepo: repos.laneSlaRepo,
      referenceConfigRepo: repos.referenceConfigRepo,
      liveAssetRepo: repos.liveAssetRepo,
      liveAssetPositionRepo: repos.liveAssetPositionRepo,
      geoFenceRepo: repos.geoFenceRepo,
    });
  } catch (err) {
    console.warn("[tms-server] Lane workbook seed skipped:", (err as Error).message);
  }

  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => {
    console.log(`[tms-server] Running on http://localhost:${port}`);
    console.log(`[tms-server] API endpoints:`);
    console.log(`  POST /api/tenders/204`);
    console.log(`  POST /api/edi/997`);
    console.log(`  POST /api/edi/990`);
    console.log(`  POST /api/edi/210`);
    console.log(`  POST /api/tracking/events`);
    console.log(`  POST /api/raw-transmissions`);
    console.log(`  POST /api/canonical-status/apply`);
    console.log(`  POST /api/invoice-audit`);
    console.log(`  POST /api/eta`);
    console.log(`  GET  /api/ui/shipments`);
    console.log(`  GET  /api/ui/shipments/:shipmentId/timeline`);
    console.log(`  GET  /api/ui/tenders`);
    console.log(`  GET  /api/ui/invoices`);
    console.log(`  GET  /api/ui/exceptions`);
    console.log(`  GET  /api/ui/ops-dashboard`);
    console.log(`  GET  /api/ui/lanes/dashboard`);
    console.log(`  GET  /api/ui/lanes/locations`);
    console.log(`  GET  /api/ui/lanes/carriers`);
    console.log(`  GET  /api/ui/lanes/rates`);
    console.log(`  GET  /api/ui/lanes/sla`);
    console.log(`  GET  /api/ui/lanes/live-map`);
    console.log(`  POST /api/ui/lanes/match-tender`);
  });
}

main().catch((err) => {
  console.error("[tms-server] Fatal error:", err);
  process.exit(1);
});
