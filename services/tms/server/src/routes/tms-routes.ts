import express from "express";
import { TenderService } from "../services/tender-service";
import { TrackingService } from "../services/tracking-service";
import { BillingService } from "../services/billing-service";

export function buildTmsRouter(
  tenderService: TenderService,
  trackingService: TrackingService,
  billingService: BillingService
) {
  const router = express.Router();

  router.post("/api/tenders/204", async (req, res) => {
    try {
      const { tender, payload } = req.body;
      await tenderService.sendEdi204(tender, payload);
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  router.post("/api/edi/997", async (req, res) => {
    try {
      await tenderService.apply997(req.body.tenderId);
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  router.post("/api/edi/990", async (req, res) => {
    try {
      await tenderService.apply990(req.body.tenderId, req.body.accepted, req.body.responseMessage);
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  router.post("/api/tracking/events", async (req, res) => {
    try {
      await trackingService.ingest(req.body);
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  router.post("/api/edi/210", async (req, res) => {
    try {
      const result = await billingService.ingest210(req.body.invoice, req.body.charges);
      res.status(200).json({ success: true, invoice: result });
    } catch (e) {
      res.status(400).json({ success: false, error: (e as Error).message });
    }
  });

  return router;
}
