import {
  Facility,
  Shipment,
  Load,
  Tender,
  TrackingEvent,
  Milestone,
  ExceptionCase,
  Invoice,
  InvoiceCharge,
  TradingPartner,
} from "../types";
import {
  InMemoryShipmentRepository,
  InMemoryLoadRepository,
  InMemoryFacilityRepository,
  InMemoryTradingPartnerRepository,
  InMemoryTenderRepository,
  InMemoryTrackingEventRepository,
  InMemoryMilestoneRepository,
  InMemoryExceptionRepository,
  InMemoryInvoiceRepository,
} from "../repositories/in-memory";

/* =========================================================
 * Facilities
 * ========================================================= */

const facilities: Facility[] = [
  {
    id: "fac-atl-sort-01",
    code: "ATL-SORT-01",
    type: "SORT_CENTER",
    actsAsLastMileSpoke: false,
    timezone: "America/New_York",
  },
  {
    id: "fac-dfw-xdock-01",
    code: "DFW-XDOCK-01",
    type: "CROSS_DOCK",
    actsAsLastMileSpoke: false,
    timezone: "America/Chicago",
  },
  {
    id: "fac-lax-fc-01",
    code: "LAX-FC-01",
    type: "FULFILLMENT_CENTER",
    actsAsLastMileSpoke: false,
    timezone: "America/Los_Angeles",
  },
  {
    id: "fac-ord-spoke-01",
    code: "ORD-SPOKE-01",
    type: "SPOKE",
    actsAsLastMileSpoke: true,
    timezone: "America/Chicago",
  },
  {
    id: "fac-sea-branch-01",
    code: "SEA-BRANCH-01",
    type: "BRANCH",
    actsAsLastMileSpoke: true,
    timezone: "America/Los_Angeles",
  },
];

/* =========================================================
 * Trading Partners
 * ========================================================= */

const tradingPartners: TradingPartner[] = [
  {
    id: "tp-schneider",
    name: "Schneider National",
    partnerCode: "SNDR",
    protocol: "EDI",
    enabled: true,
    metadata: { scac: "SNDR", ediVersion: "5010" },
  },
  {
    id: "tp-xpo",
    name: "XPO Logistics",
    partnerCode: "XPOL",
    protocol: "EDI",
    enabled: true,
    metadata: { scac: "XPOL", ediVersion: "5010" },
  },
  {
    id: "tp-uber-freight",
    name: "Uber Freight",
    partnerCode: "UBER",
    protocol: "API",
    enabled: true,
    metadata: { apiVersion: "v2", webhookUrl: "https://api.uberfreight.com/webhook" },
  },
  {
    id: "tp-jb-hunt",
    name: "J.B. Hunt Transport",
    partnerCode: "JBHT",
    protocol: "EDI",
    enabled: true,
    metadata: { scac: "JBHT", ediVersion: "5010" },
  },
];

/* =========================================================
 * Shipments
 * ========================================================= */

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(n: number): string {
  return new Date(Date.now() + n * 60 * 60 * 1000).toISOString();
}

const shipments: Shipment[] = [
  {
    id: "SHP-1001",
    shipmentNumber: "SHP-1001",
    legType: "FIRST_MILE",
    originFacilityId: "fac-lax-fc-01",
    destinationFacilityId: "fac-atl-sort-01",
    status: "IN_TRANSIT",
    serviceLevel: "STANDARD",
    pieceCount: 240,
    palletCount: 12,
    weightLbs: 18500,
    cubeFt: 960,
    references: { PRO: "PRO-887241", BOL: "BOL-20260315-001" },
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(4),
  },
  {
    id: "SHP-1002",
    shipmentNumber: "SHP-1002",
    legType: "MIDDLE_MILE",
    originFacilityId: "fac-atl-sort-01",
    destinationFacilityId: "fac-dfw-xdock-01",
    status: "AT_FACILITY",
    serviceLevel: "EXPEDITED",
    pieceCount: 480,
    palletCount: 24,
    weightLbs: 36200,
    cubeFt: 1920,
    references: { PRO: "PRO-887242", BOL: "BOL-20260314-007" },
    createdAt: daysAgo(5),
    updatedAt: hoursAgo(8),
  },
  {
    id: "SHP-1003",
    shipmentNumber: "SHP-1003",
    legType: "BYPASS_TO_LAST_MILE",
    originFacilityId: "fac-dfw-xdock-01",
    destinationFacilityId: "fac-ord-spoke-01",
    status: "DELIVERED",
    serviceLevel: "STANDARD",
    pieceCount: 96,
    palletCount: 4,
    weightLbs: 6800,
    references: { PRO: "PRO-887243", BOL: "BOL-20260312-003" },
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
  },
  {
    id: "SHP-1004",
    shipmentNumber: "SHP-1004",
    legType: "FIRST_MILE",
    originFacilityId: "fac-lax-fc-01",
    destinationFacilityId: "fac-sea-branch-01",
    status: "TENDERED",
    serviceLevel: "ECONOMY",
    pieceCount: 150,
    palletCount: 8,
    weightLbs: 12400,
    cubeFt: 640,
    references: { PRO: "PRO-887244", BOL: "BOL-20260318-002" },
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(2),
  },
  {
    id: "SHP-1005",
    shipmentNumber: "SHP-1005",
    legType: "MIDDLE_MILE",
    originFacilityId: "fac-atl-sort-01",
    destinationFacilityId: "fac-ord-spoke-01",
    status: "EXCEPTION",
    serviceLevel: "STANDARD",
    pieceCount: 320,
    palletCount: 16,
    weightLbs: 24000,
    cubeFt: 1280,
    references: { PRO: "PRO-887245", BOL: "BOL-20260316-005" },
    createdAt: daysAgo(4),
    updatedAt: hoursAgo(6),
  },
  {
    id: "SHP-1006",
    shipmentNumber: "SHP-1006",
    legType: "FIRST_MILE",
    originFacilityId: "fac-lax-fc-01",
    destinationFacilityId: "fac-dfw-xdock-01",
    status: "PLANNED",
    serviceLevel: "STANDARD",
    pieceCount: 200,
    palletCount: 10,
    weightLbs: 15600,
    references: { PRO: "PRO-887246" },
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(6),
  },
  {
    id: "SHP-1007",
    shipmentNumber: "SHP-1007",
    legType: "BYPASS_TO_LAST_MILE",
    originFacilityId: "fac-dfw-xdock-01",
    destinationFacilityId: "fac-sea-branch-01",
    status: "BILLED",
    serviceLevel: "EXPEDITED",
    pieceCount: 64,
    palletCount: 3,
    weightLbs: 4200,
    references: { PRO: "PRO-887247", BOL: "BOL-20260310-009" },
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
  },
  {
    id: "SHP-1008",
    shipmentNumber: "SHP-1008",
    legType: "FIRST_MILE",
    originFacilityId: "fac-lax-fc-01",
    destinationFacilityId: "fac-atl-sort-01",
    status: "IN_TRANSIT",
    serviceLevel: "STANDARD",
    pieceCount: 180,
    palletCount: 9,
    weightLbs: 14200,
    cubeFt: 720,
    references: { PRO: "PRO-887248", BOL: "BOL-20260317-004" },
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(1),
  },
];

/* =========================================================
 * Loads
 * ========================================================= */

const loads: Load[] = [
  {
    id: "LOAD-2001",
    loadNumber: "LOAD-2001",
    shipmentIds: ["SHP-1001"],
    carrierId: "tp-schneider",
    trailerId: "SNDR-53FT-4412",
    originStopId: "stop-lax-01",
    destinationStopId: "stop-atl-01",
    status: "IN_TRANSIT",
    plannedDepartureAt: daysAgo(1),
    plannedArrivalAt: hoursFromNow(6),
    actualDepartureAt: daysAgo(1),
  },
  {
    id: "LOAD-2002",
    loadNumber: "LOAD-2002",
    shipmentIds: ["SHP-1002"],
    carrierId: "tp-xpo",
    trailerId: "XPOL-53FT-8821",
    originStopId: "stop-atl-02",
    destinationStopId: "stop-dfw-01",
    status: "AT_FACILITY",
    plannedDepartureAt: daysAgo(2),
    plannedArrivalAt: hoursAgo(8),
    actualDepartureAt: daysAgo(2),
    actualArrivalAt: hoursAgo(8),
  },
  {
    id: "LOAD-2003",
    loadNumber: "LOAD-2003",
    shipmentIds: ["SHP-1003"],
    carrierId: "tp-jb-hunt",
    trailerId: "JBHT-28FT-1134",
    originStopId: "stop-dfw-02",
    destinationStopId: "stop-ord-01",
    status: "DELIVERED",
    plannedDepartureAt: daysAgo(5),
    plannedArrivalAt: daysAgo(3),
    actualDepartureAt: daysAgo(5),
    actualArrivalAt: daysAgo(3),
  },
  {
    id: "LOAD-2004",
    loadNumber: "LOAD-2004",
    shipmentIds: ["SHP-1004"],
    carrierId: "tp-uber-freight",
    originStopId: "stop-lax-02",
    destinationStopId: "stop-sea-01",
    status: "TENDERED",
    plannedDepartureAt: hoursFromNow(12),
    plannedArrivalAt: hoursFromNow(36),
  },
  {
    id: "LOAD-2005",
    loadNumber: "LOAD-2005",
    shipmentIds: ["SHP-1005", "SHP-1008"],
    carrierId: "tp-schneider",
    trailerId: "SNDR-53FT-7790",
    originStopId: "stop-atl-03",
    destinationStopId: "stop-ord-02",
    status: "IN_TRANSIT",
    plannedDepartureAt: daysAgo(2),
    plannedArrivalAt: hoursAgo(2),
    actualDepartureAt: daysAgo(2),
  },
];

/* =========================================================
 * Tenders
 * ========================================================= */

const tenders: Tender[] = [
  {
    id: "TND-3001",
    shipmentId: "SHP-1001",
    loadId: "LOAD-2001",
    carrierId: "tp-schneider",
    connectionType: "EDI",
    outboundDocumentType: "204",
    status: "ACCEPTED",
    tenderedAt: daysAgo(2),
    respondedAt: daysAgo(2),
    externalReference: "204-SNDR-88001",
    responseCode: "A",
  },
  {
    id: "TND-3002",
    shipmentId: "SHP-1002",
    loadId: "LOAD-2002",
    carrierId: "tp-xpo",
    connectionType: "EDI",
    outboundDocumentType: "204",
    status: "ACCEPTED",
    tenderedAt: daysAgo(5),
    respondedAt: daysAgo(5),
    externalReference: "204-XPOL-88002",
    responseCode: "A",
  },
  {
    id: "TND-3003",
    shipmentId: "SHP-1003",
    loadId: "LOAD-2003",
    carrierId: "tp-jb-hunt",
    connectionType: "EDI",
    outboundDocumentType: "204",
    status: "ACCEPTED",
    tenderedAt: daysAgo(7),
    respondedAt: daysAgo(7),
    externalReference: "204-JBHT-88003",
    responseCode: "A",
  },
  {
    id: "TND-3004",
    shipmentId: "SHP-1004",
    loadId: "LOAD-2004",
    carrierId: "tp-uber-freight",
    connectionType: "API",
    status: "TRANSMITTED",
    tenderedAt: hoursAgo(2),
    externalReference: "API-UBER-88004",
  },
  {
    id: "TND-3005",
    shipmentId: "SHP-1005",
    loadId: "LOAD-2005",
    carrierId: "tp-schneider",
    connectionType: "EDI",
    outboundDocumentType: "204",
    status: "REJECTED",
    tenderedAt: daysAgo(4),
    respondedAt: daysAgo(4),
    externalReference: "204-SNDR-88005",
    responseCode: "D",
    responseMessage: "Equipment unavailable at origin - capacity constraint",
  },
  {
    id: "TND-3006",
    shipmentId: "SHP-1005",
    loadId: "LOAD-2005",
    carrierId: "tp-xpo",
    connectionType: "EDI",
    outboundDocumentType: "204",
    status: "TECH_ACK_RECEIVED",
    tenderedAt: daysAgo(3),
    externalReference: "204-XPOL-88006",
  },
];

/* =========================================================
 * Tracking Events
 * ========================================================= */

const trackingEvents: TrackingEvent[] = [
  // SHP-1001 first mile journey
  {
    id: "EVT-4001",
    shipmentId: "SHP-1001",
    loadId: "LOAD-2001",
    source: "EDI",
    sourceDocumentType: "214",
    eventCode: "PICKED_UP",
    eventAt: daysAgo(1),
    city: "Los Angeles",
    state: "CA",
    country: "US",
    facilityId: "fac-lax-fc-01",
    rawPayload: {},
  },
  {
    id: "EVT-4002",
    shipmentId: "SHP-1001",
    loadId: "LOAD-2001",
    source: "EDI",
    sourceDocumentType: "214",
    eventCode: "DEPARTED_PICKUP",
    eventAt: hoursAgo(22),
    city: "Los Angeles",
    state: "CA",
    country: "US",
    rawPayload: {},
  },
  {
    id: "EVT-4003",
    shipmentId: "SHP-1001",
    loadId: "LOAD-2001",
    source: "EDI",
    sourceDocumentType: "214",
    eventCode: "IN_TRANSIT_FIRST_MILE",
    eventAt: hoursAgo(20),
    city: "Barstow",
    state: "CA",
    country: "US",
    latitude: 34.8958,
    longitude: -117.0173,
    etaAt: hoursFromNow(6),
    rawPayload: {},
  },
  {
    id: "EVT-4004",
    shipmentId: "SHP-1001",
    loadId: "LOAD-2001",
    source: "GPS",
    eventCode: "CHECKPOINT",
    eventAt: hoursAgo(10),
    city: "Albuquerque",
    state: "NM",
    country: "US",
    latitude: 35.0844,
    longitude: -106.6504,
    etaAt: hoursFromNow(5),
    rawPayload: {},
  },

  // SHP-1002 middle mile - arrived at facility
  {
    id: "EVT-4005",
    shipmentId: "SHP-1002",
    loadId: "LOAD-2002",
    source: "EDI",
    sourceDocumentType: "214",
    eventCode: "DEPARTED_FACILITY",
    eventAt: daysAgo(2),
    city: "Atlanta",
    state: "GA",
    country: "US",
    facilityId: "fac-atl-sort-01",
    rawPayload: {},
  },
  {
    id: "EVT-4006",
    shipmentId: "SHP-1002",
    loadId: "LOAD-2002",
    source: "EDI",
    sourceDocumentType: "214",
    eventCode: "FACILITY_CHECKIN",
    eventAt: hoursAgo(8),
    city: "Dallas",
    state: "TX",
    country: "US",
    facilityId: "fac-dfw-xdock-01",
    rawPayload: {},
  },

  // SHP-1003 delivered
  {
    id: "EVT-4007",
    shipmentId: "SHP-1003",
    loadId: "LOAD-2003",
    source: "EDI",
    sourceDocumentType: "214",
    eventCode: "DELIVERED",
    eventAt: daysAgo(1),
    city: "Chicago",
    state: "IL",
    country: "US",
    facilityId: "fac-ord-spoke-01",
    rawPayload: {},
  },

  // SHP-1005 exception - linehaul delay
  {
    id: "EVT-4008",
    shipmentId: "SHP-1005",
    loadId: "LOAD-2005",
    source: "EDI",
    sourceDocumentType: "214",
    eventCode: "IN_TRANSIT_MIDDLE_MILE",
    eventAt: daysAgo(1),
    city: "Birmingham",
    state: "AL",
    country: "US",
    latitude: 33.5207,
    longitude: -86.8025,
    rawPayload: {},
  },
  {
    id: "EVT-4009",
    shipmentId: "SHP-1005",
    loadId: "LOAD-2005",
    source: "API",
    eventCode: "LINEHAUL_DELAY",
    eventReasonCode: "WEATHER",
    eventAt: hoursAgo(6),
    city: "Nashville",
    state: "TN",
    country: "US",
    latitude: 36.1627,
    longitude: -86.7816,
    rawPayload: { reason: "Severe weather - ice storm on I-65" },
  },

  // SHP-1008 in transit
  {
    id: "EVT-4010",
    shipmentId: "SHP-1008",
    loadId: "LOAD-2005",
    source: "EDI",
    sourceDocumentType: "214",
    eventCode: "PICKED_UP",
    eventAt: daysAgo(2),
    city: "Los Angeles",
    state: "CA",
    country: "US",
    facilityId: "fac-lax-fc-01",
    rawPayload: {},
  },
  {
    id: "EVT-4011",
    shipmentId: "SHP-1008",
    loadId: "LOAD-2005",
    source: "GPS",
    eventCode: "CHECKPOINT",
    eventAt: hoursAgo(1),
    city: "Memphis",
    state: "TN",
    country: "US",
    latitude: 35.1495,
    longitude: -90.0490,
    etaAt: hoursFromNow(8),
    rawPayload: {},
  },

  // SHP-1004 tender sent event
  {
    id: "EVT-4012",
    shipmentId: "SHP-1004",
    loadId: "LOAD-2004",
    source: "API",
    eventCode: "TENDER_SENT",
    eventAt: hoursAgo(2),
    rawPayload: {},
  },
];

/* =========================================================
 * Milestones
 * ========================================================= */

const milestones: Milestone[] = [
  {
    id: "MS-5001",
    shipmentId: "SHP-1001",
    loadId: "LOAD-2001",
    code: "PICKUP_CONFIRMED",
    occurredAt: daysAgo(1),
    facilityId: "fac-lax-fc-01",
    sourceEventId: "EVT-4001",
  },
  {
    id: "MS-5002",
    shipmentId: "SHP-1001",
    loadId: "LOAD-2001",
    code: "DEPARTED_PICKUP",
    occurredAt: hoursAgo(22),
    sourceEventId: "EVT-4002",
  },
  {
    id: "MS-5003",
    shipmentId: "SHP-1001",
    loadId: "LOAD-2001",
    code: "IN_TRANSIT_TO_ORIGIN_FACILITY",
    occurredAt: hoursAgo(20),
    sourceEventId: "EVT-4003",
  },
  {
    id: "MS-5004",
    shipmentId: "SHP-1002",
    loadId: "LOAD-2002",
    code: "DEPARTED_ORIGIN_FACILITY",
    occurredAt: daysAgo(2),
    facilityId: "fac-atl-sort-01",
    sourceEventId: "EVT-4005",
  },
  {
    id: "MS-5005",
    shipmentId: "SHP-1002",
    loadId: "LOAD-2002",
    code: "CHECKED_IN_AT_FACILITY",
    occurredAt: hoursAgo(8),
    facilityId: "fac-dfw-xdock-01",
    sourceEventId: "EVT-4006",
  },
  {
    id: "MS-5006",
    shipmentId: "SHP-1003",
    loadId: "LOAD-2003",
    code: "DELIVERED",
    occurredAt: daysAgo(1),
    facilityId: "fac-ord-spoke-01",
    sourceEventId: "EVT-4007",
  },
  {
    id: "MS-5007",
    shipmentId: "SHP-1005",
    loadId: "LOAD-2005",
    code: "LINEHAUL_IN_TRANSIT",
    occurredAt: daysAgo(1),
    sourceEventId: "EVT-4008",
  },
];

/* =========================================================
 * Exceptions
 * ========================================================= */

const exceptions: ExceptionCase[] = [
  {
    id: "EXC-6001",
    shipmentId: "SHP-1005",
    loadId: "LOAD-2005",
    category: "TENDER",
    code: "TENDER_REJECTED",
    severity: "HIGH",
    openedAt: daysAgo(4),
    notes: "Equipment unavailable at origin - capacity constraint",
  },
  {
    id: "EXC-6002",
    shipmentId: "SHP-1005",
    loadId: "LOAD-2005",
    category: "LINEHAUL",
    code: "LINEHAUL_DELAY",
    severity: "MEDIUM",
    openedAt: hoursAgo(6),
    notes: "Severe weather - ice storm on I-65 near Nashville",
  },
  {
    id: "EXC-6003",
    shipmentId: "SHP-1004",
    loadId: "LOAD-2004",
    category: "PICKUP",
    code: "MISSED_PICKUP",
    severity: "HIGH",
    openedAt: hoursAgo(1),
    notes: "Carrier did not arrive within pickup window",
  },
];

/* =========================================================
 * Invoices & Charges
 * ========================================================= */

const invoices: Invoice[] = [
  {
    id: "INV-7001",
    carrierId: "tp-jb-hunt",
    shipmentId: "SHP-1003",
    loadId: "LOAD-2003",
    invoiceNumber: "JBHT-INV-440291",
    invoiceDate: daysAgo(1),
    source: "EDI_210",
    currency: "USD",
    subtotalAmount: 1225,
    accessorialAmount: 75,
    totalAmount: 1300,
    status: "APPROVED",
  },
  {
    id: "INV-7002",
    carrierId: "tp-xpo",
    shipmentId: "SHP-1007",
    loadId: "LOAD-2003",
    invoiceNumber: "XPOL-INV-882104",
    invoiceDate: daysAgo(3),
    source: "EDI_210",
    currency: "USD",
    subtotalAmount: 2150,
    accessorialAmount: 200,
    totalAmount: 2350,
    status: "DISPUTED",
  },
  {
    id: "INV-7003",
    carrierId: "tp-schneider",
    shipmentId: "SHP-1007",
    invoiceNumber: "SNDR-INV-557832",
    invoiceDate: daysAgo(5),
    source: "EDI_210",
    currency: "USD",
    subtotalAmount: 980,
    accessorialAmount: 0,
    totalAmount: 980,
    status: "APPROVED",
  },
];

const invoiceCharges: InvoiceCharge[] = [
  // INV-7001
  { id: "CHG-8001", invoiceId: "INV-7001", chargeCode: "LINEHAUL", description: "Linehaul freight", amount: 1000, approved: true },
  { id: "CHG-8002", invoiceId: "INV-7001", chargeCode: "FSC", description: "Fuel surcharge", amount: 150, approved: true },
  { id: "CHG-8003", invoiceId: "INV-7001", chargeCode: "DETENTION", description: "Detention at delivery", amount: 75, quantity: 1.5, unitOfMeasure: "HR", approved: true },
  // INV-7002
  { id: "CHG-8004", invoiceId: "INV-7002", chargeCode: "LINEHAUL", description: "Linehaul freight", amount: 1800, approved: true },
  { id: "CHG-8005", invoiceId: "INV-7002", chargeCode: "FSC", description: "Fuel surcharge", amount: 150, approved: true },
  { id: "CHG-8006", invoiceId: "INV-7002", chargeCode: "LUMPER", description: "Lumper service", amount: 200, approved: false, disputeReason: "ACCESSORIAL_NOT_APPROVED" },
  // INV-7003
  { id: "CHG-8007", invoiceId: "INV-7003", chargeCode: "LINEHAUL", description: "Linehaul freight", amount: 830, approved: true },
  { id: "CHG-8008", invoiceId: "INV-7003", chargeCode: "FSC", description: "Fuel surcharge", amount: 150, approved: true },
];

/* =========================================================
 * Seed Function
 * ========================================================= */

export interface SeedRepos {
  shipmentRepo: InMemoryShipmentRepository;
  loadRepo: InMemoryLoadRepository;
  facilityRepo: InMemoryFacilityRepository;
  tradingPartnerRepo: InMemoryTradingPartnerRepository;
  tenderRepo: InMemoryTenderRepository;
  trackingRepo: InMemoryTrackingEventRepository;
  milestoneRepo: InMemoryMilestoneRepository;
  exceptionRepo: InMemoryExceptionRepository;
  invoiceRepo: InMemoryInvoiceRepository;
}

export async function seedAllData(repos: SeedRepos): Promise<void> {
  for (const f of facilities) {
    await repos.facilityRepo.create(f);
  }

  for (const tp of tradingPartners) {
    await repos.tradingPartnerRepo.create(tp);
  }

  for (const s of shipments) {
    await repos.shipmentRepo.create(s);
  }

  for (const l of loads) {
    await repos.loadRepo.create(l);
  }

  for (const t of tenders) {
    await repos.tenderRepo.create(t);
  }

  for (const e of trackingEvents) {
    await repos.trackingRepo.create(e);
  }

  for (const m of milestones) {
    await repos.milestoneRepo.create(m);
  }

  for (const ex of exceptions) {
    await repos.exceptionRepo.create(ex);
  }

  // Group charges by invoice
  const chargesByInvoice = new Map<string, InvoiceCharge[]>();
  for (const c of invoiceCharges) {
    const arr = chargesByInvoice.get(c.invoiceId) ?? [];
    arr.push(c);
    chargesByInvoice.set(c.invoiceId, arr);
  }

  for (const inv of invoices) {
    const charges = chargesByInvoice.get(inv.id) ?? [];
    await repos.invoiceRepo.create(inv, charges);
  }

  console.log(`[seed] Loaded ${facilities.length} facilities`);
  console.log(`[seed] Loaded ${tradingPartners.length} trading partners`);
  console.log(`[seed] Loaded ${shipments.length} shipments`);
  console.log(`[seed] Loaded ${loads.length} loads`);
  console.log(`[seed] Loaded ${tenders.length} tenders`);
  console.log(`[seed] Loaded ${trackingEvents.length} tracking events`);
  console.log(`[seed] Loaded ${milestones.length} milestones`);
  console.log(`[seed] Loaded ${exceptions.length} exceptions`);
  console.log(`[seed] Loaded ${invoices.length} invoices with ${invoiceCharges.length} charges`);
}
