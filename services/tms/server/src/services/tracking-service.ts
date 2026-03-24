import { TrackingEvent, CanonicalMilestoneCode, ShipmentTimeline } from "../types";
import {
  TrackingEventRepository,
  MilestoneRepository,
  TrackingQueryRepository,
  IdFactory,
} from "../types/ports";

/* =========================================================
 * Milestone Mapper
 * ========================================================= */

export class MilestoneMapper {
  map(event: TrackingEvent): CanonicalMilestoneCode | null {
    const code = event.eventCode.toUpperCase();

    if (code === "204_SENT" || code === "TENDER_SENT") return "TENDER_SENT";
    if (code === "997_ACCEPTED") return "TECH_ACK_RECEIVED";
    if (code === "990_ACCEPTED" || code === "TENDER_ACCEPTED") return "TENDER_ACCEPTED";
    if (code === "990_REJECTED" || code === "TENDER_REJECTED") return "TENDER_REJECTED";
    if (code === "DRIVER_DISPATCHED") return "DRIVER_DISPATCHED";
    if (code === "EN_ROUTE_TO_PICKUP") return "EN_ROUTE_TO_PICKUP";
    if (code === "AT_PICKUP") return "AT_PICKUP_LOCATION";
    if (code === "PICKED_UP") return "PICKUP_CONFIRMED";
    if (code === "LOADED") return "FREIGHT_LOADED";
    if (code === "DEPARTED_PICKUP") return "DEPARTED_PICKUP";
    if (code === "IN_TRANSIT_FIRST_MILE") return "IN_TRANSIT_TO_ORIGIN_FACILITY";
    if (code === "FACILITY_CHECKIN") return "CHECKED_IN_AT_FACILITY";
    if (code === "AT_DOCK") return "AT_DOCK";
    if (code === "UNLOAD_START") return "UNLOADING_STARTED";
    if (code === "UNLOAD_COMPLETE") return "UNLOADING_COMPLETED";
    if (code === "RECEIVED") return "RECEIVED_AT_FACILITY";
    if (code === "READY_FOR_MIDDLE_MILE") return "READY_FOR_MIDDLE_MILE";
    if (code === "OUTBOUND_STAGED") return "OUTBOUND_STAGED";
    if (code === "TRAILER_ASSIGNED") return "TRAILER_ASSIGNED";
    if (code === "DOOR_ASSIGNED") return "DOOR_ASSIGNED";
    if (code === "LOAD_START") return "LOADING_STARTED";
    if (code === "LOAD_COMPLETE") return "LOADING_COMPLETED";
    if (code === "DEPARTED_FACILITY") return "DEPARTED_ORIGIN_FACILITY";
    if (code === "IN_TRANSIT_MIDDLE_MILE") return "LINEHAUL_IN_TRANSIT";
    if (code === "CHECKPOINT") return "CHECKPOINT_SCAN";
    if (code === "ETA_UPDATE") return "ETA_UPDATED";
    if (code === "ARRIVED_SPOKE") return "ARRIVED_AT_DESTINATION_SPOKE";
    if (code === "DEST_YARD_CHECKIN") return "CHECKED_IN_DESTINATION_YARD";
    if (code === "DEST_AT_DOCK") return "AT_DESTINATION_DOCK";
    if (code === "RECEIVED_SPOKE") return "RECEIVED_AT_LAST_MILE_SPOKE";
    if (code === "FINAL_SORT_START") return "FINAL_SORT_STARTED";
    if (code === "FINAL_SORT_COMPLETE") return "ROUTE_LEVEL_SORT_COMPLETE";
    if (code === "DISPATCH_READY") return "DISPATCH_READY";
    if (code === "DISPATCHED_LAST_MILE") return "DISPATCHED_TO_LAST_MILE";
    if (code === "DELIVERED") return "DELIVERED";
    if (code === "210_RECEIVED") return "INVOICE_RECEIVED";
    if (code === "INVOICE_APPROVED") return "INVOICE_APPROVED";
    if (code === "INVOICE_REJECTED") return "INVOICE_REJECTED";

    return null;
  }
}

/* =========================================================
 * Tracking Service
 * ========================================================= */

export class TrackingService {
  constructor(
    private readonly trackingRepo: TrackingEventRepository,
    private readonly milestoneRepo: MilestoneRepository,
    private readonly mapper: MilestoneMapper,
    private readonly ids: IdFactory
  ) {}

  async ingest(event: TrackingEvent): Promise<void> {
    const naturalKey = [
      event.shipmentId ?? "",
      event.loadId ?? "",
      event.source,
      event.sourceDocumentType ?? "",
      event.eventCode,
      event.eventAt,
      event.city ?? "",
      event.state ?? "",
    ].join("|");

    const exists = await this.trackingRepo.existsByNaturalKey(naturalKey);
    if (exists) return;

    await this.trackingRepo.create(event);

    const milestoneCode = this.mapper.map(event);
    if (milestoneCode && event.shipmentId) {
      await this.milestoneRepo.create({
        id: this.ids.next(),
        shipmentId: event.shipmentId,
        loadId: event.loadId,
        code: milestoneCode,
        occurredAt: event.eventAt,
        facilityId: event.facilityId,
        sourceEventId: event.id,
      });
    }
  }
}

/* =========================================================
 * Tracking Timeline Service
 * ========================================================= */

export class TrackingTimelineService {
  constructor(private readonly repo: TrackingQueryRepository) {}

  async buildShipmentTimeline(shipmentId: string): Promise<ShipmentTimeline> {
    const [events, milestones, exceptions] = await Promise.all([
      this.repo.getTrackingEventsForShipment(shipmentId),
      this.repo.getMilestonesForShipment(shipmentId),
      this.repo.getOpenExceptionsForShipment(shipmentId),
    ]);

    const sortedMilestones = [...milestones].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const lastEvent = [...events].sort((a, b) => a.eventAt.localeCompare(b.eventAt)).at(-1);
    const latestEta = [...events]
      .filter((e) => e.etaAt)
      .sort((a, b) => (a.etaAt || "").localeCompare(b.etaAt || ""))
      .at(-1)?.etaAt;

    return {
      shipmentId,
      loadId: lastEvent?.loadId,
      currentStatus: sortedMilestones.at(-1)?.code ?? "PLANNED",
      milestones: sortedMilestones.map((m) => ({
        code: m.code,
        occurredAt: m.occurredAt,
        facilityId: m.facilityId,
        sourceEventId: m.sourceEventId,
      })),
      lastEventAt: lastEvent?.eventAt,
      etaAt: latestEta,
      hasExceptions: exceptions.length > 0,
    };
  }
}
