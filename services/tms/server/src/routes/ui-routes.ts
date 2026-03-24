import express from "express";
import { TrackingTimelineService } from "../services/tracking-service";
import { OpsDashboardService } from "../services/dashboard-service";
import {
  InMemoryShipmentRepository,
  InMemoryTenderRepository,
  InMemoryInvoiceRepository,
  InMemoryExceptionRepository,
  InMemoryLoadRepository,
  InMemoryFacilityRepository,
} from "../repositories/in-memory";

export function buildUiRouter(
  timelineService: TrackingTimelineService,
  dashboardService: OpsDashboardService,
  shipmentRepo: InMemoryShipmentRepository,
  tenderRepo: InMemoryTenderRepository,
  invoiceRepo: InMemoryInvoiceRepository,
  exceptionRepo: InMemoryExceptionRepository,
  loadRepo: InMemoryLoadRepository,
  facilityRepo: InMemoryFacilityRepository
) {
  const router = express.Router();

  router.get("/api/ui/shipments/:shipmentId/timeline", async (req, res) => {
    try {
      const result = await timelineService.buildShipmentTimeline(req.params.shipmentId);
      res.status(200).json(result);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  router.get("/api/ui/ops-dashboard", async (req, res) => {
    try {
      const carrierFilter = req.query.carrier as string | undefined;
      const fromFilter = req.query.from as string | undefined;
      const toFilter = req.query.to as string | undefined;

      const tenders = Array.from(tenderRepo.items.values());
      const shipments = await shipmentRepo.findAll();
      const loads = Array.from(loadRepo.items.values());
      const facilities = Array.from(facilityRepo.items.values());
      const exceptions = exceptionRepo.items;
      const invoices = Array.from(invoiceRepo.invoices.values());

      const facilityName = (id?: string) => {
        if (!id) return "";
        const f = facilities.find((fac) => fac.id === id);
        return f ? f.code : id;
      };

      const getCarrierForShipment = (shipmentId: string) => {
        const load = loads.find((l) => l.shipmentIds.includes(shipmentId));
        return load?.carrierId ?? "";
      };

      const inDateRange = (dateStr: string) => {
        if (!fromFilter && !toFilter) return true;
        const d = new Date(dateStr).getTime();
        if (fromFilter && d < new Date(fromFilter + "T00:00:00Z").getTime()) return false;
        if (toFilter && d >= new Date(toFilter + "T00:00:00Z").getTime()) return false;
        return true;
      };

      // Filter tenders
      let filteredTenders = tenders;
      if (carrierFilter) {
        filteredTenders = filteredTenders.filter((t) => t.carrierId === carrierFilter);
      }
      if (fromFilter || toFilter) {
        filteredTenders = filteredTenders.filter((t) => inDateRange(t.tenderedAt));
      }

      // Filter shipments
      let filteredShipments = shipments;
      if (carrierFilter) {
        const carrierShipmentIds = new Set(
          loads.filter((l) => l.carrierId === carrierFilter).flatMap((l) => l.shipmentIds)
        );
        filteredShipments = filteredShipments.filter((s) => carrierShipmentIds.has(s.id));
      }
      if (fromFilter || toFilter) {
        filteredShipments = filteredShipments.filter((s) => inDateRange(s.createdAt));
      }

      // Filter invoices
      let filteredInvoices = invoices;
      if (carrierFilter) {
        filteredInvoices = filteredInvoices.filter((i) => i.carrierId === carrierFilter);
      }
      if (fromFilter || toFilter) {
        filteredInvoices = filteredInvoices.filter((i) => inDateRange(i.invoiceDate));
      }

      // Tender KPIs
      const openTenders = filteredTenders.filter(
        (t) => t.status === "TRANSMITTED" || t.status === "TECH_ACK_RECEIVED"
      ).length;
      const acceptedTenders = filteredTenders.filter((t) => t.status === "ACCEPTED").length;
      const rejectedTenders = filteredTenders.filter((t) => t.status === "REJECTED").length;

      // Shipment KPIs
      const inTransit = filteredShipments.filter((s) => s.status === "IN_TRANSIT").length;
      const delayed = filteredShipments.filter((s) => s.status === "EXCEPTION").length;

      // Invoice KPIs
      const invoiceDisputes = filteredInvoices.filter((i) => i.status === "DISPUTED").length;

      // In-transit by carrier breakdown
      const inTransitByCarrier: Record<string, number> = {};
      for (const s of filteredShipments.filter((s) => s.status === "IN_TRANSIT")) {
        const carrier = getCarrierForShipment(s.id);
        if (carrier) {
          inTransitByCarrier[carrier] = (inTransitByCarrier[carrier] || 0) + 1;
        }
      }

      // Tenders by carrier breakdown
      const tendersByCarrier: Record<string, { open: number; accepted: number; rejected: number }> = {};
      for (const t of filteredTenders) {
        if (!tendersByCarrier[t.carrierId]) {
          tendersByCarrier[t.carrierId] = { open: 0, accepted: 0, rejected: 0 };
        }
        if (t.status === "TRANSMITTED" || t.status === "TECH_ACK_RECEIVED") {
          tendersByCarrier[t.carrierId].open++;
        } else if (t.status === "ACCEPTED") {
          tendersByCarrier[t.carrierId].accepted++;
        } else if (t.status === "REJECTED") {
          tendersByCarrier[t.carrierId].rejected++;
        }
      }

      // Unique carriers list for filter dropdown
      const allCarriers = new Set<string>();
      for (const t of tenders) allCarriers.add(t.carrierId);
      for (const l of loads) if (l.carrierId) allCarriers.add(l.carrierId);

      // Shipment rows
      const shipmentRows = filteredShipments.map((s) => {
        const load = loads.find((l) => l.shipmentIds.includes(s.id));
        const shipExceptions = exceptions.filter(
          (e) => !e.resolvedAt && e.shipmentId === s.id
        );
        return {
          shipmentId: s.shipmentNumber,
          loadId: load?.loadNumber,
          legType: s.legType,
          currentStatus: s.status,
          origin: facilityName(s.originFacilityId),
          destination: facilityName(s.destinationFacilityId),
          carrier: load?.carrierId ?? "",
          plannedArrivalAt: load?.plannedArrivalAt,
          hasExceptions: shipExceptions.length > 0,
        };
      });

      res.status(200).json({
        cards: [
          { label: "Open Tenders", count: openTenders },
          { label: "Accepted Tenders", count: acceptedTenders },
          { label: "Rejected Tenders", count: rejectedTenders },
          { label: "In Transit", count: inTransit },
          { label: "Delayed", count: delayed },
          { label: "Invoice Disputes", count: invoiceDisputes },
        ],
        shipments: shipmentRows,
        inTransitByCarrier,
        tendersByCarrier,
        carriers: Array.from(allCarriers).sort(),
      });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  // Carriers list endpoint
  router.get("/api/ui/carriers", async (_req, res) => {
    try {
      const tenders = Array.from(tenderRepo.items.values());
      const loads = Array.from(loadRepo.items.values());
      const invoices = Array.from(invoiceRepo.invoices.values());

      const allCarriers = new Set<string>();
      for (const t of tenders) if (t.carrierId) allCarriers.add(t.carrierId);
      for (const l of loads) if (l.carrierId) allCarriers.add(l.carrierId);
      for (const i of invoices) if (i.carrierId) allCarriers.add(i.carrierId);

      res.status(200).json(Array.from(allCarriers).sort());
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  router.get("/api/ui/shipments", async (req, res) => {
    try {
      const carrierFilter = req.query.carrier as string | undefined;
      const fromFilter = req.query.from as string | undefined;
      const toFilter = req.query.to as string | undefined;

      const shipments = await shipmentRepo.findAll();
      const loads = Array.from(loadRepo.items.values());
      const facilities = Array.from(facilityRepo.items.values());

      const facilityName = (id?: string) => {
        if (!id) return "";
        const f = facilities.find((fac) => fac.id === id);
        return f ? f.code : id;
      };

      const inDateRange = (dateStr: string) => {
        if (!fromFilter && !toFilter) return true;
        const d = new Date(dateStr).getTime();
        if (fromFilter && d < new Date(fromFilter + "T00:00:00Z").getTime()) return false;
        if (toFilter && d >= new Date(toFilter + "T00:00:00Z").getTime()) return false;
        return true;
      };

      let filtered = shipments;

      if (carrierFilter) {
        const carrierShipmentIds = new Set(
          loads.filter((l) => l.carrierId === carrierFilter).flatMap((l) => l.shipmentIds)
        );
        filtered = filtered.filter((s) => carrierShipmentIds.has(s.id));
      }

      if (fromFilter || toFilter) {
        filtered = filtered.filter((s) => inDateRange(s.createdAt));
      }

      const mapped = filtered.map((s) => {
        const load = loads.find((l) => l.shipmentIds.includes(s.id));
        return {
          shipmentId: s.shipmentNumber,
          loadId: load?.loadNumber ?? "",
          legType: s.legType,
          currentStatus: s.status,
          origin: facilityName(s.originFacilityId),
          destination: facilityName(s.destinationFacilityId),
          carrier: load?.carrierId ?? "",
          weight: s.weightLbs,
          pieces: s.pieceCount,
          pallets: s.palletCount,
          cubeFt: s.cubeFt,
          serviceLevel: s.serviceLevel,
          plannedArrivalAt: load?.plannedArrivalAt ?? "",
          etaAt: load?.actualArrivalAt ?? "",
          hasExceptions: s.status === "EXCEPTION",
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          references: s.references,
        };
      });
      res.status(200).json(mapped);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  router.get("/api/ui/tenders", async (req, res) => {
    try {
      const carrierFilter = req.query.carrier as string | undefined;
      const fromFilter = req.query.from as string | undefined;
      const toFilter = req.query.to as string | undefined;

      const inDateRange = (dateStr: string) => {
        if (!fromFilter && !toFilter) return true;
        const d = new Date(dateStr).getTime();
        if (fromFilter && d < new Date(fromFilter + "T00:00:00Z").getTime()) return false;
        if (toFilter && d >= new Date(toFilter + "T00:00:00Z").getTime()) return false;
        return true;
      };

      let tenders = Array.from(tenderRepo.items.values());

      if (carrierFilter) {
        tenders = tenders.filter((t) => t.carrierId === carrierFilter);
      }

      if (fromFilter || toFilter) {
        tenders = tenders.filter((t) => inDateRange(t.tenderedAt));
      }

      const mapped = tenders.map((t) => ({
        tenderId: t.id,
        shipmentId: t.shipmentId,
        loadId: t.loadId,
        carrier: t.carrierId,
        connectionType: t.connectionType,
        status: t.status,
        tenderedAt: t.tenderedAt,
        respondedAt: t.respondedAt,
        response: t.responseMessage ?? "",
        externalReference: t.externalReference,
      }));
      res.status(200).json(mapped);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  router.get("/api/ui/invoices", async (req, res) => {
    try {
      const carrierFilter = req.query.carrier as string | undefined;
      const fromFilter = req.query.from as string | undefined;
      const toFilter = req.query.to as string | undefined;

      const inDateRange = (dateStr: string) => {
        if (!fromFilter && !toFilter) return true;
        const d = new Date(dateStr).getTime();
        if (fromFilter && d < new Date(fromFilter + "T00:00:00Z").getTime()) return false;
        if (toFilter && d >= new Date(toFilter + "T00:00:00Z").getTime()) return false;
        return true;
      };

      let invoices = Array.from(invoiceRepo.invoices.values());

      if (carrierFilter) {
        invoices = invoices.filter((i) => i.carrierId === carrierFilter);
      }

      if (fromFilter || toFilter) {
        invoices = invoices.filter((i) => inDateRange(i.invoiceDate));
      }

      const mapped = invoices.map((inv) => {
        const charges = invoiceRepo.charges.get(inv.id) ?? [];
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          carrier: inv.carrierId,
          shipmentId: inv.shipmentId ?? "",
          loadId: inv.loadId ?? "",
          invoiceDate: inv.invoiceDate,
          subtotal: inv.subtotalAmount,
          accessorialTotal: inv.accessorialAmount,
          total: inv.totalAmount,
          currency: inv.currency,
          status: inv.status,
          charges: charges.map((c) => ({
            chargeCode: c.chargeCode,
            description: c.description ?? "",
            amount: c.amount,
            approved: c.approved,
            disputeReason: c.disputeReason,
          })),
        };
      });
      res.status(200).json(mapped);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  router.get("/api/ui/exceptions", async (req, res) => {
    try {
      const carrierFilter = req.query.carrier as string | undefined;
      const fromFilter = req.query.from as string | undefined;
      const toFilter = req.query.to as string | undefined;

      const loads = Array.from(loadRepo.items.values());

      const inDateRange = (dateStr: string) => {
        if (!fromFilter && !toFilter) return true;
        const d = new Date(dateStr).getTime();
        if (fromFilter && d < new Date(fromFilter + "T00:00:00Z").getTime()) return false;
        if (toFilter && d >= new Date(toFilter + "T00:00:00Z").getTime()) return false;
        return true;
      };

      let openExceptions = exceptionRepo.items.filter((e) => !e.resolvedAt);

      if (carrierFilter) {
        const carrierShipmentIds = new Set(
          loads.filter((l) => l.carrierId === carrierFilter).flatMap((l) => l.shipmentIds)
        );
        openExceptions = openExceptions.filter((e) => {
          if (e.shipmentId && carrierShipmentIds.has(e.shipmentId)) return true;
          if (e.loadId) {
            const load = loads.find((l) => l.id === e.loadId);
            if (load && load.carrierId === carrierFilter) return true;
          }
          return false;
        });
      }

      if (fromFilter || toFilter) {
        openExceptions = openExceptions.filter((e) => inDateRange(e.openedAt));
      }

      const mapped = openExceptions.map((ex) => ({
        exceptionId: ex.id,
        shipmentId: ex.shipmentId ?? "",
        loadId: ex.loadId ?? "",
        category: ex.category,
        code: ex.code,
        severity: ex.severity,
        openedAt: ex.openedAt,
        closedAt: ex.resolvedAt,
        notes: ex.notes ?? "",
      }));
      res.status(200).json(mapped);
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  return router;
}
