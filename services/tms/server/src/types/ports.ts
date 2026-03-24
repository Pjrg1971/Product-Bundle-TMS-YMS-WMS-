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
  NormalizedMessage,
} from "./index";

/* =========================================================
 * Utility Ports
 * ========================================================= */

export interface IdFactory {
  next(): string;
}

export interface Clock {
  nowIso(): string;
}

export class UuidFactory implements IdFactory {
  next(): string {
    return crypto.randomUUID();
  }
}

export class SystemClock implements Clock {
  nowIso(): string {
    return new Date().toISOString();
  }
}

/* =========================================================
 * Repository Ports
 * ========================================================= */

export interface RawTransmissionRepository {
  create(tx: RawTransmission): Promise<void>;
  findById(id: string): Promise<RawTransmission | null>;
  updateStatus(id: string, status: TransmissionStatus, patch?: Partial<RawTransmission>): Promise<void>;
  existsByControlNumbers(input: {
    tradingPartnerId: string;
    interchangeControlNumber?: string;
    groupControlNumber?: string;
    transactionSetControlNumber?: string;
    externalReference?: string;
  }): Promise<boolean>;
}

export interface CanonicalTenderRepository {
  create(msg: CanonicalTenderMessage): Promise<void>;
}

export interface CanonicalStatusRepository {
  create(msg: CanonicalStatusMessage): Promise<void>;
  existsByNaturalKey(key: string): Promise<boolean>;
}

export interface CanonicalInvoiceRepository {
  create(msg: CanonicalInvoiceMessage): Promise<void>;
}

export interface TenderRepository {
  create(tender: Tender): Promise<void>;
  findById(id: string): Promise<Tender | null>;
  updateStatus(id: string, status: TenderStatus, patch?: Partial<Tender>): Promise<void>;
}

export interface TrackingEventRepository {
  create(event: TrackingEvent): Promise<void>;
  existsByNaturalKey(key: string): Promise<boolean>;
  getTrackingEventsForShipment(shipmentId: string): Promise<TrackingEvent[]>;
}

export interface MilestoneRepository {
  create(milestone: Milestone): Promise<void>;
  getMilestonesForShipment(shipmentId: string): Promise<Milestone[]>;
}

export interface ExceptionRepository {
  create(exceptionCase: ExceptionCase): Promise<void>;
  existsOpenException(input: { shipmentId?: string; loadId?: string; code: string }): Promise<boolean>;
  getOpenExceptionsForShipment(shipmentId: string): Promise<Array<{ code: string; severity: string }>>;
}

export interface InvoiceRepository {
  create(invoice: Invoice, charges: InvoiceCharge[]): Promise<void>;
  findByInvoiceNumber(carrierId: string, invoiceNumber: string): Promise<Invoice | null>;
}

export interface ShipmentCostRepository {
  getExpectedCharges(loadId?: string, shipmentId?: string): Promise<{
    linehaul: number;
    fuel: number;
    approvedAccessorials: Record<string, number>;
  }>;
}

export interface ExpectedChargeRepository {
  getExpectedForLoadOrShipment(input: {
    loadId?: string;
    shipmentId?: string;
    carrierId: string;
  }): Promise<{
    linehaul?: number;
    fuel?: number;
    approvedAccessorials: Record<string, number>;
  }>;
}

export interface TrackingQueryRepository {
  getTrackingEventsForShipment(shipmentId: string): Promise<TrackingEvent[]>;
  getMilestonesForShipment(shipmentId: string): Promise<Milestone[]>;
  getOpenExceptionsForShipment(shipmentId: string): Promise<Array<{ code: string; severity: string }>>;
}

export interface RoutePlanRepository {
  getPlannedTransitMinutes(input: {
    originFacilityId?: string;
    destinationFacilityId?: string;
    legType?: string;
  }): Promise<number | null>;
}

export interface OpsDashboardQueryRepository {
  countOpenTenders(): Promise<number>;
  countAcceptedTenders(): Promise<number>;
  countRejectedTenders(): Promise<number>;
  countInTransitShipments(): Promise<number>;
  countDelayedShipments(): Promise<number>;
  countOpenInvoiceDisputes(): Promise<number>;
  getOpsShipments(): Promise<OpsShipmentRow[]>;
}

/* =========================================================
 * Gateway Ports
 * ========================================================= */

export interface EdiGateway {
  send204(payload: unknown): Promise<{ interchangeId: string; controlNumber: string }>;
}

export interface ApiCarrierGateway {
  createTender(payload: unknown): Promise<{ externalReference: string; accepted: boolean }>;
}

/* =========================================================
 * Normalizer Port
 * ========================================================= */

export interface MessageNormalizer {
  supports(tx: RawTransmission): boolean;
  normalize(tx: RawTransmission): Promise<NormalizedMessage>;
}
