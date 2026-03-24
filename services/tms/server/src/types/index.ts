export type LegType = "FIRST_MILE" | "MIDDLE_MILE" | "BYPASS_TO_LAST_MILE";
export type ConnectionType = "EDI" | "API";
export type TransmissionDirection = "INBOUND" | "OUTBOUND";
export type TransmissionProtocol = "EDI" | "API";
export type TransmissionStatus =
  | "RECEIVED"
  | "PARSED"
  | "NORMALIZED"
  | "PROCESSED"
  | "FAILED";

export type TenderStatus =
  | "CREATED"
  | "TRANSMITTED"
  | "TECH_ACK_RECEIVED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "RE_TENDERED";

export type ShipmentStatus =
  | "PLANNED"
  | "TENDERED"
  | "DISPATCHED"
  | "AT_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "AT_FACILITY"
  | "UNLOADING"
  | "RECEIVED"
  | "SORTED"
  | "AT_SPOKE"
  | "DISPATCH_READY"
  | "DELIVERED"
  | "EXCEPTION"
  | "BILLED"
  | "CLOSED";

export type EdiDocumentType =
  | "204"
  | "990"
  | "214"
  | "210"
  | "997"
  | "824"
  | "213"
  | "240";

export type CanonicalMilestoneCode =
  | "ORDER_READY_FOR_PICKUP"
  | "PICKUP_REQUESTED"
  | "TENDER_SENT"
  | "TECH_ACK_RECEIVED"
  | "TENDER_ACCEPTED"
  | "TENDER_REJECTED"
  | "DRIVER_DISPATCHED"
  | "EN_ROUTE_TO_PICKUP"
  | "AT_PICKUP_LOCATION"
  | "PICKUP_CONFIRMED"
  | "FREIGHT_LOADED"
  | "DEPARTED_PICKUP"
  | "IN_TRANSIT_TO_ORIGIN_FACILITY"
  | "CHECKED_IN_AT_FACILITY"
  | "AT_DOCK"
  | "UNLOADING_STARTED"
  | "UNLOADING_COMPLETED"
  | "RECEIVED_AT_FACILITY"
  | "READY_FOR_MIDDLE_MILE"
  | "LOAD_PLANNED_AT_ORIGIN_FACILITY"
  | "OUTBOUND_STAGED"
  | "TRAILER_ASSIGNED"
  | "DOOR_ASSIGNED"
  | "LOADING_STARTED"
  | "LOADING_COMPLETED"
  | "DEPARTED_ORIGIN_FACILITY"
  | "LINEHAUL_IN_TRANSIT"
  | "CHECKPOINT_SCAN"
  | "ETA_UPDATED"
  | "ARRIVED_AT_DESTINATION_SPOKE"
  | "CHECKED_IN_DESTINATION_YARD"
  | "AT_DESTINATION_DOCK"
  | "RECEIVED_AT_LAST_MILE_SPOKE"
  | "FINAL_SORT_STARTED"
  | "ROUTE_LEVEL_SORT_COMPLETE"
  | "DISPATCH_READY"
  | "DISPATCHED_TO_LAST_MILE"
  | "DELIVERED"
  | "INVOICE_RECEIVED"
  | "INVOICE_APPROVED"
  | "INVOICE_REJECTED";

export interface Facility {
  id: string;
  code: string;
  type:
    | "SORT_CENTER"
    | "CROSS_DOCK"
    | "FULFILLMENT_CENTER"
    | "TRANSLOAD"
    | "SPOKE"
    | "BRANCH";
  actsAsLastMileSpoke: boolean;
  timezone: string;
}

export interface Stop {
  id: string;
  sequence: number;
  stopType: "PICKUP" | "DELIVERY" | "TRANSFER";
  facilityId?: string;
  customerId?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  actualArriveAt?: string;
  actualDepartAt?: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  legType: LegType;
  originFacilityId?: string;
  destinationFacilityId?: string;
  pickupCustomerId?: string;
  consigneeId?: string;
  status: ShipmentStatus;
  serviceLevel?: string;
  pieceCount: number;
  palletCount: number;
  weightLbs: number;
  cubeFt?: number;
  references: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Load {
  id: string;
  loadNumber: string;
  shipmentIds: string[];
  carrierId?: string;
  trailerId?: string;
  truckId?: string;
  originStopId: string;
  destinationStopId: string;
  status: ShipmentStatus;
  plannedDepartureAt?: string;
  plannedArrivalAt?: string;
  actualDepartureAt?: string;
  actualArrivalAt?: string;
}

export interface Tender {
  id: string;
  shipmentId: string;
  loadId: string;
  carrierId: string;
  connectionType: ConnectionType;
  outboundDocumentType?: EdiDocumentType;
  status: TenderStatus;
  tenderedAt: string;
  respondedAt?: string;
  externalReference?: string;
  responseCode?: string;
  responseMessage?: string;
}

export interface TradingPartner {
  id: string;
  name: string;
  partnerCode: string;
  protocol: TransmissionProtocol;
  enabled: boolean;
  metadata?: Record<string, string>;
}

export interface RawTransmission {
  id: string;
  tradingPartnerId: string;
  protocol: TransmissionProtocol;
  direction: TransmissionDirection;
  documentType: string;
  externalReference?: string;
  interchangeControlNumber?: string;
  groupControlNumber?: string;
  transactionSetControlNumber?: string;
  shipmentId?: string;
  loadId?: string;
  status: TransmissionStatus;
  receivedAt: string;
  processedAt?: string;
  errorMessage?: string;
  rawPayload: string;
  rawHeaders?: Record<string, string>;
}

export interface TrackingEvent {
  id: string;
  shipmentId?: string;
  loadId?: string;
  source: "EDI" | "API" | "YMS" | "WMS" | "GPS" | "MANUAL";
  sourceDocumentType?: EdiDocumentType;
  eventCode: string;
  eventReasonCode?: string;
  eventAt: string;
  city?: string;
  state?: string;
  country?: string;
  facilityId?: string;
  latitude?: number;
  longitude?: number;
  etaAt?: string;
  rawPayload: unknown;
}

export interface Milestone {
  id: string;
  shipmentId: string;
  loadId?: string;
  code: CanonicalMilestoneCode;
  occurredAt: string;
  facilityId?: string;
  sourceEventId?: string;
  notes?: string;
}

export interface ExceptionCase {
  id: string;
  shipmentId?: string;
  loadId?: string;
  category:
    | "TENDER"
    | "PICKUP"
    | "LINEHAUL"
    | "FACILITY"
    | "BILLING"
    | "INTEGRATION";
  code: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  openedAt: string;
  resolvedAt?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  carrierId: string;
  shipmentId?: string;
  loadId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  source: "EDI_210" | "API";
  currency: string;
  subtotalAmount: number;
  accessorialAmount: number;
  totalAmount: number;
  status: "RECEIVED" | "MATCHED" | "APPROVED" | "DISPUTED" | "REJECTED" | "POSTED";
}

export interface InvoiceCharge {
  id: string;
  invoiceId: string;
  chargeCode: string;
  description?: string;
  amount: number;
  quantity?: number;
  unitOfMeasure?: string;
  approved: boolean;
  disputeReason?: string;
}

export interface CanonicalTenderMessage {
  id: string;
  rawTransmissionId: string;
  shipmentId: string;
  loadId: string;
  carrierId: string;
  tenderStatus: TenderStatus;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  equipmentType?: string;
  serviceLevel?: string;
  references: Record<string, string>;
  weightLbs?: number;
  palletCount?: number;
  pieceCount?: number;
  normalizedAt: string;
}

export interface CanonicalStatusMessage {
  id: string;
  rawTransmissionId: string;
  shipmentId?: string;
  loadId?: string;
  carrierId?: string;
  eventCode: string;
  eventReasonCode?: string;
  eventAt: string;
  city?: string;
  state?: string;
  country?: string;
  facilityId?: string;
  latitude?: number;
  longitude?: number;
  etaAt?: string;
  references: Record<string, string>;
  normalizedAt: string;
}

export interface CanonicalInvoiceMessage {
  id: string;
  rawTransmissionId: string;
  carrierId: string;
  shipmentId?: string;
  loadId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  totalAmount: number;
  normalizedAt: string;
  charges: Array<{
    chargeCode: string;
    description?: string;
    amount: number;
    quantity?: number;
    unitOfMeasure?: string;
  }>;
}

export interface TimelineMilestoneView {
  code: string;
  occurredAt: string;
  facilityId?: string;
  sourceEventId?: string;
  isException?: boolean;
  notes?: string;
}

export interface ShipmentTimeline {
  shipmentId: string;
  loadId?: string;
  currentStatus: string;
  milestones: TimelineMilestoneView[];
  lastEventAt?: string;
  etaAt?: string;
  hasExceptions: boolean;
}

export interface OpsDashboardCard {
  label: string;
  count: number;
  trend?: number;
}

export interface OpsShipmentRow {
  shipmentId: string;
  loadId?: string;
  legType?: string;
  currentStatus: string;
  currentMilestone?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  plannedArrivalAt?: string;
  etaAt?: string;
  delayMinutes?: number;
  hasExceptions: boolean;
}

export interface OpsDashboardView {
  cards: OpsDashboardCard[];
  shipments: OpsShipmentRow[];
}

export type NormalizedMessage =
  | { kind: "TENDER"; data: CanonicalTenderMessage }
  | { kind: "STATUS"; data: CanonicalStatusMessage }
  | { kind: "INVOICE"; data: CanonicalInvoiceMessage };

export interface InvoiceAuditResult {
  invoice: Invoice;
  charges: InvoiceCharge[];
  passed: boolean;
  reasons: string[];
}

export interface EtaComputationInput {
  shipmentId: string;
  legType?: string;
  originFacilityId?: string;
  destinationFacilityId?: string;
  lastKnownEvent?: TrackingEvent;
}
