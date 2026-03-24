import crypto from "node:crypto";
import {
  RawTransmission,
  TransmissionStatus,
  CanonicalTenderMessage,
  CanonicalStatusMessage,
  CanonicalInvoiceMessage,
  Tender,
  TenderStatus,
  TrackingEvent,
  Milestone,
  ExceptionCase,
  Invoice,
  InvoiceCharge,
  OpsShipmentRow,
  Shipment,
  Load,
  Facility,
  TradingPartner,
} from "../types";
import {
  RawTransmissionRepository,
  CanonicalTenderRepository,
  CanonicalStatusRepository,
  CanonicalInvoiceRepository,
  TenderRepository,
  TrackingEventRepository,
  MilestoneRepository,
  ExceptionRepository,
  InvoiceRepository,
  ShipmentCostRepository,
  ExpectedChargeRepository,
  RoutePlanRepository,
  OpsDashboardQueryRepository,
  TrackingQueryRepository,
  EdiGateway,
  ApiCarrierGateway,
} from "../types/ports";

/* =========================================================
 * In-Memory Repositories
 * ========================================================= */

export class InMemoryRawTransmissionRepository implements RawTransmissionRepository {
  private readonly items = new Map<string, RawTransmission>();

  async create(tx: RawTransmission): Promise<void> {
    this.items.set(tx.id, tx);
  }

  async findById(id: string): Promise<RawTransmission | null> {
    return this.items.get(id) ?? null;
  }

  async updateStatus(id: string, status: TransmissionStatus, patch?: Partial<RawTransmission>): Promise<void> {
    const current = this.items.get(id);
    if (!current) return;
    this.items.set(id, { ...current, ...patch, status });
  }

  async existsByControlNumbers(input: {
    tradingPartnerId: string;
    interchangeControlNumber?: string;
    groupControlNumber?: string;
    transactionSetControlNumber?: string;
    externalReference?: string;
  }): Promise<boolean> {
    for (const item of this.items.values()) {
      const samePartner = item.tradingPartnerId === input.tradingPartnerId;
      const sameControl =
        (!!input.interchangeControlNumber && item.interchangeControlNumber === input.interchangeControlNumber) ||
        (!!input.groupControlNumber && item.groupControlNumber === input.groupControlNumber) ||
        (!!input.transactionSetControlNumber && item.transactionSetControlNumber === input.transactionSetControlNumber) ||
        (!!input.externalReference && item.externalReference === input.externalReference);
      if (samePartner && sameControl) return true;
    }
    return false;
  }
}

export class InMemoryCanonicalTenderRepository implements CanonicalTenderRepository {
  public readonly items: CanonicalTenderMessage[] = [];
  async create(msg: CanonicalTenderMessage): Promise<void> {
    this.items.push(msg);
  }
}

export class InMemoryCanonicalStatusRepository implements CanonicalStatusRepository {
  public readonly items: CanonicalStatusMessage[] = [];
  async create(msg: CanonicalStatusMessage): Promise<void> {
    this.items.push(msg);
  }
  async existsByNaturalKey(key: string): Promise<boolean> {
    return this.items.some((x) => [x.shipmentId ?? "", x.loadId ?? "", x.eventCode, x.eventAt].join("|") === key);
  }
}

export class InMemoryCanonicalInvoiceRepository implements CanonicalInvoiceRepository {
  public readonly items: CanonicalInvoiceMessage[] = [];
  async create(msg: CanonicalInvoiceMessage): Promise<void> {
    this.items.push(msg);
  }
}

export class InMemoryTenderRepository implements TenderRepository {
  public readonly items = new Map<string, Tender>();
  async create(tender: Tender): Promise<void> { this.items.set(tender.id, tender); }
  async findById(id: string): Promise<Tender | null> { return this.items.get(id) ?? null; }
  async updateStatus(id: string, status: TenderStatus, patch?: Partial<Tender>): Promise<void> {
    const current = this.items.get(id);
    if (!current) return;
    this.items.set(id, { ...current, ...patch, status });
  }
}

export class InMemoryTrackingEventRepository implements TrackingEventRepository {
  public readonly items: TrackingEvent[] = [];
  async create(event: TrackingEvent): Promise<void> { this.items.push(event); }
  async existsByNaturalKey(key: string): Promise<boolean> {
    return this.items.some((e) =>
      [
        e.shipmentId ?? "",
        e.loadId ?? "",
        e.source,
        e.sourceDocumentType ?? "",
        e.eventCode,
        e.eventAt,
        e.city ?? "",
        e.state ?? "",
      ].join("|") === key
    );
  }
  async getTrackingEventsForShipment(shipmentId: string): Promise<TrackingEvent[]> {
    return this.items.filter((e) => e.shipmentId === shipmentId);
  }
}

export class InMemoryMilestoneRepository implements MilestoneRepository {
  public readonly items: Milestone[] = [];
  async create(milestone: Milestone): Promise<void> { this.items.push(milestone); }
  async getMilestonesForShipment(shipmentId: string): Promise<Milestone[]> {
    return this.items.filter((m) => m.shipmentId === shipmentId);
  }
}

export class InMemoryExceptionRepository implements ExceptionRepository {
  public readonly items: ExceptionCase[] = [];
  async create(exceptionCase: ExceptionCase): Promise<void> { this.items.push(exceptionCase); }
  async existsOpenException(input: { shipmentId?: string; loadId?: string; code: string }): Promise<boolean> {
    return this.items.some(
      (e) =>
        !e.resolvedAt &&
        e.code === input.code &&
        e.shipmentId === input.shipmentId &&
        e.loadId === input.loadId
    );
  }
  async getOpenExceptionsForShipment(shipmentId: string): Promise<Array<{ code: string; severity: string }>> {
    return this.items
      .filter((e) => !e.resolvedAt && e.shipmentId === shipmentId)
      .map((e) => ({ code: e.code, severity: e.severity }));
  }
}

export class InMemoryInvoiceRepository implements InvoiceRepository {
  public readonly invoices = new Map<string, Invoice>();
  public readonly charges = new Map<string, InvoiceCharge[]>();
  async create(invoice: Invoice, charges: InvoiceCharge[]): Promise<void> {
    this.invoices.set(`${invoice.carrierId}:${invoice.invoiceNumber}`, invoice);
    this.charges.set(invoice.id, charges);
  }
  async findByInvoiceNumber(carrierId: string, invoiceNumber: string): Promise<Invoice | null> {
    return this.invoices.get(`${carrierId}:${invoiceNumber}`) ?? null;
  }
}

export class InMemoryShipmentCostRepository implements ShipmentCostRepository {
  async getExpectedCharges(): Promise<{ linehaul: number; fuel: number; approvedAccessorials: Record<string, number> }> {
    return {
      linehaul: 1000,
      fuel: 150,
      approvedAccessorials: { DETENTION: 75, LUMPER: 50 },
    };
  }
}

export class InMemoryExpectedChargeRepository implements ExpectedChargeRepository {
  async getExpectedForLoadOrShipment(): Promise<{ linehaul?: number; fuel?: number; approvedAccessorials: Record<string, number> }> {
    return {
      linehaul: 1000,
      fuel: 150,
      approvedAccessorials: { DETENTION: 75, LUMPER: 50 },
    };
  }
}

export class InMemoryRoutePlanRepository implements RoutePlanRepository {
  async getPlannedTransitMinutes(): Promise<number | null> {
    return 180;
  }
}

export class InMemoryShipmentRepository {
  public readonly items = new Map<string, Shipment>();
  async create(shipment: Shipment): Promise<void> { this.items.set(shipment.id, shipment); }
  async findById(id: string): Promise<Shipment | null> { return this.items.get(id) ?? null; }
  async findAll(): Promise<Shipment[]> { return Array.from(this.items.values()); }
}

export class InMemoryLoadRepository {
  public readonly items = new Map<string, Load>();
  async create(load: Load): Promise<void> { this.items.set(load.id, load); }
  async findById(id: string): Promise<Load | null> { return this.items.get(id) ?? null; }
  async findAll(): Promise<Load[]> { return Array.from(this.items.values()); }
}

export class InMemoryFacilityRepository {
  public readonly items = new Map<string, Facility>();
  async create(facility: Facility): Promise<void> { this.items.set(facility.id, facility); }
  async findById(id: string): Promise<Facility | null> { return this.items.get(id) ?? null; }
  async findAll(): Promise<Facility[]> { return Array.from(this.items.values()); }
}

export class InMemoryTradingPartnerRepository {
  public readonly items = new Map<string, TradingPartner>();
  async create(partner: TradingPartner): Promise<void> { this.items.set(partner.id, partner); }
  async findById(id: string): Promise<TradingPartner | null> { return this.items.get(id) ?? null; }
  async findAll(): Promise<TradingPartner[]> { return Array.from(this.items.values()); }
}

export class InMemoryOpsDashboardQueryRepository implements OpsDashboardQueryRepository {
  constructor(
    private readonly tenderRepo: InMemoryTenderRepository,
    private readonly shipmentRepo: InMemoryShipmentRepository,
    private readonly invoiceRepo: InMemoryInvoiceRepository,
    private readonly exceptionRepo: InMemoryExceptionRepository,
    private readonly loadRepo: InMemoryLoadRepository,
    private readonly facilityRepo: InMemoryFacilityRepository
  ) {}

  async countOpenTenders(): Promise<number> {
    let count = 0;
    for (const t of this.tenderRepo.items.values()) {
      if (t.status === "TRANSMITTED" || t.status === "TECH_ACK_RECEIVED") count++;
    }
    return count;
  }

  async countAcceptedTenders(): Promise<number> {
    let count = 0;
    for (const t of this.tenderRepo.items.values()) {
      if (t.status === "ACCEPTED") count++;
    }
    return count;
  }

  async countRejectedTenders(): Promise<number> {
    let count = 0;
    for (const t of this.tenderRepo.items.values()) {
      if (t.status === "REJECTED") count++;
    }
    return count;
  }

  async countInTransitShipments(): Promise<number> {
    let count = 0;
    for (const s of this.shipmentRepo.items.values()) {
      if (s.status === "IN_TRANSIT") count++;
    }
    return count;
  }

  async countDelayedShipments(): Promise<number> {
    let count = 0;
    for (const s of this.shipmentRepo.items.values()) {
      if (s.status === "EXCEPTION") count++;
    }
    return count;
  }

  async countOpenInvoiceDisputes(): Promise<number> {
    let count = 0;
    for (const inv of this.invoiceRepo.invoices.values()) {
      if (inv.status === "DISPUTED") count++;
    }
    return count;
  }

  async getOpsShipments(): Promise<OpsShipmentRow[]> {
    const rows: OpsShipmentRow[] = [];
    for (const s of this.shipmentRepo.items.values()) {
      const exceptions = await this.exceptionRepo.getOpenExceptionsForShipment(s.id);
      const originFacility = s.originFacilityId ? await this.facilityRepo.findById(s.originFacilityId) : null;
      const destFacility = s.destinationFacilityId ? await this.facilityRepo.findById(s.destinationFacilityId) : null;

      let loadId: string | undefined;
      let carrierId: string | undefined;
      let plannedArrivalAt: string | undefined;
      for (const load of this.loadRepo.items.values()) {
        if (load.shipmentIds.includes(s.id)) {
          loadId = load.id;
          carrierId = load.carrierId;
          plannedArrivalAt = load.plannedArrivalAt;
          break;
        }
      }

      rows.push({
        shipmentId: s.id,
        loadId,
        legType: s.legType,
        currentStatus: s.status,
        origin: originFacility?.code ?? s.pickupCustomerId,
        destination: destFacility?.code ?? s.consigneeId,
        carrier: carrierId,
        plannedArrivalAt,
        hasExceptions: exceptions.length > 0,
      });
    }
    return rows;
  }
}

export class InMemoryTrackingQueryRepository implements TrackingQueryRepository {
  constructor(
    private readonly trackingRepo: InMemoryTrackingEventRepository,
    private readonly milestoneRepo: InMemoryMilestoneRepository,
    private readonly exceptionRepo: InMemoryExceptionRepository
  ) {}

  async getTrackingEventsForShipment(shipmentId: string): Promise<TrackingEvent[]> {
    return this.trackingRepo.getTrackingEventsForShipment(shipmentId);
  }

  async getMilestonesForShipment(shipmentId: string): Promise<Milestone[]> {
    return this.milestoneRepo.getMilestonesForShipment(shipmentId);
  }

  async getOpenExceptionsForShipment(shipmentId: string): Promise<Array<{ code: string; severity: string }>> {
    return this.exceptionRepo.getOpenExceptionsForShipment(shipmentId);
  }
}

/* =========================================================
 * Stub Gateways
 * ========================================================= */

export class StubEdiGateway implements EdiGateway {
  async send204(): Promise<{ interchangeId: string; controlNumber: string }> {
    return { interchangeId: crypto.randomUUID(), controlNumber: `204-${Date.now()}` };
  }
}

export class StubApiCarrierGateway implements ApiCarrierGateway {
  async createTender(): Promise<{ externalReference: string; accepted: boolean }> {
    return { externalReference: `API-${Date.now()}`, accepted: true };
  }
}
