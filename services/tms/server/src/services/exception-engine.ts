import crypto from "node:crypto";
import { TrackingEvent, ExceptionCase } from "../types";
import { ExceptionRepository, Clock } from "../types/ports";

export interface ExceptionRule {
  matches(event: TrackingEvent): boolean;
  build(event: TrackingEvent): ExceptionCase;
}

export class TenderRejectedRule implements ExceptionRule {
  constructor(private readonly clock: Clock) {}

  matches(event: TrackingEvent): boolean {
    return event.eventCode === "990_REJECTED" || event.eventCode === "TENDER_REJECTED";
  }

  build(event: TrackingEvent): ExceptionCase {
    return {
      id: crypto.randomUUID(),
      shipmentId: event.shipmentId,
      loadId: event.loadId,
      category: "TENDER",
      code: "TENDER_REJECTED",
      severity: "HIGH",
      openedAt: this.clock.nowIso(),
      notes: event.eventReasonCode,
    };
  }
}

export class MissedPickupRule implements ExceptionRule {
  constructor(private readonly clock: Clock) {}

  matches(event: TrackingEvent): boolean {
    return event.eventCode === "MISSED_PICKUP" || event.eventCode === "PICKUP_DELAY";
  }

  build(event: TrackingEvent): ExceptionCase {
    return {
      id: crypto.randomUUID(),
      shipmentId: event.shipmentId,
      loadId: event.loadId,
      category: "PICKUP",
      code: event.eventCode,
      severity: "HIGH",
      openedAt: this.clock.nowIso(),
    };
  }
}

export class LinehaulDelayRule implements ExceptionRule {
  constructor(private readonly clock: Clock) {}

  matches(event: TrackingEvent): boolean {
    return event.eventCode === "LINEHAUL_DELAY";
  }

  build(event: TrackingEvent): ExceptionCase {
    return {
      id: crypto.randomUUID(),
      shipmentId: event.shipmentId,
      loadId: event.loadId,
      category: "LINEHAUL",
      code: "LINEHAUL_DELAY",
      severity: "MEDIUM",
      openedAt: this.clock.nowIso(),
    };
  }
}

export class ExceptionEngine {
  constructor(
    private readonly exceptionRepo: ExceptionRepository,
    private readonly rules: ExceptionRule[]
  ) {}

  async evaluate(event: TrackingEvent): Promise<void> {
    for (const rule of this.rules) {
      if (!rule.matches(event)) continue;
      const exception = rule.build(event);
      const exists = await this.exceptionRepo.existsOpenException({
        shipmentId: exception.shipmentId,
        loadId: exception.loadId,
        code: exception.code,
      });
      if (!exists) await this.exceptionRepo.create(exception);
    }
  }
}
