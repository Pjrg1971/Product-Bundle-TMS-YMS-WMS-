import { Pool } from 'pg';
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
} from '../types';
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
  ExpectedChargeRepository,
  RoutePlanRepository,
  OpsDashboardQueryRepository,
  TrackingQueryRepository,
} from '../types/ports';

/* =========================================================
 * PostgreSQL Repository Implementations
 * ========================================================= */

export class PgRawTransmissionRepository implements RawTransmissionRepository {
  constructor(private pool: Pool) {}

  async create(tx: RawTransmission): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.raw_transmissions (id, trading_partner_id, protocol, direction, document_type,
        external_reference, interchange_control_number, group_control_number, transaction_set_control_number,
        shipment_id, load_id, status, received_at, processed_at, error_message, raw_payload, raw_headers)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [tx.id, tx.tradingPartnerId, tx.protocol, tx.direction, tx.documentType,
       tx.externalReference, tx.interchangeControlNumber, tx.groupControlNumber,
       tx.transactionSetControlNumber, tx.shipmentId, tx.loadId, tx.status,
       tx.receivedAt, tx.processedAt, tx.errorMessage, tx.rawPayload,
       tx.rawHeaders ? JSON.stringify(tx.rawHeaders) : null]
    );
  }

  async findById(id: string): Promise<RawTransmission | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.raw_transmissions WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async updateStatus(id: string, status: TransmissionStatus, patch?: Partial<RawTransmission>): Promise<void> {
    const sets: string[] = ['status = $2'];
    const params: unknown[] = [id, status];
    let idx = 3;

    if (patch?.processedAt !== undefined) {
      sets.push(`processed_at = $${idx}`);
      params.push(patch.processedAt);
      idx++;
    }
    if (patch?.errorMessage !== undefined) {
      sets.push(`error_message = $${idx}`);
      params.push(patch.errorMessage);
      idx++;
    }
    if (patch?.shipmentId !== undefined) {
      sets.push(`shipment_id = $${idx}`);
      params.push(patch.shipmentId);
      idx++;
    }
    if (patch?.loadId !== undefined) {
      sets.push(`load_id = $${idx}`);
      params.push(patch.loadId);
      idx++;
    }

    await this.pool.query(
      `UPDATE tms.raw_transmissions SET ${sets.join(', ')} WHERE id = $1`,
      params
    );
  }

  async existsByControlNumbers(input: {
    tradingPartnerId: string;
    interchangeControlNumber?: string;
    groupControlNumber?: string;
    transactionSetControlNumber?: string;
    externalReference?: string;
  }): Promise<boolean> {
    const conditions: string[] = ['trading_partner_id = $1'];
    const params: unknown[] = [input.tradingPartnerId];
    let idx = 2;

    const orConditions: string[] = [];
    if (input.interchangeControlNumber) {
      orConditions.push(`interchange_control_number = $${idx}`);
      params.push(input.interchangeControlNumber);
      idx++;
    }
    if (input.groupControlNumber) {
      orConditions.push(`group_control_number = $${idx}`);
      params.push(input.groupControlNumber);
      idx++;
    }
    if (input.transactionSetControlNumber) {
      orConditions.push(`transaction_set_control_number = $${idx}`);
      params.push(input.transactionSetControlNumber);
      idx++;
    }
    if (input.externalReference) {
      orConditions.push(`external_reference = $${idx}`);
      params.push(input.externalReference);
      idx++;
    }

    if (orConditions.length === 0) return false;

    const { rows } = await this.pool.query(
      `SELECT 1 FROM tms.raw_transmissions WHERE ${conditions.join(' AND ')} AND (${orConditions.join(' OR ')}) LIMIT 1`,
      params
    );
    return rows.length > 0;
  }

  private mapRow(row: Record<string, unknown>): RawTransmission {
    return {
      id: row.id as string,
      tradingPartnerId: row.trading_partner_id as string,
      protocol: row.protocol as RawTransmission['protocol'],
      direction: row.direction as RawTransmission['direction'],
      documentType: row.document_type as string,
      externalReference: row.external_reference as string | undefined,
      interchangeControlNumber: row.interchange_control_number as string | undefined,
      groupControlNumber: row.group_control_number as string | undefined,
      transactionSetControlNumber: row.transaction_set_control_number as string | undefined,
      shipmentId: row.shipment_id as string | undefined,
      loadId: row.load_id as string | undefined,
      status: row.status as TransmissionStatus,
      receivedAt: (row.received_at as Date)?.toISOString?.() ?? row.received_at as string,
      processedAt: row.processed_at ? ((row.processed_at as Date)?.toISOString?.() ?? row.processed_at as string) : undefined,
      errorMessage: row.error_message as string | undefined,
      rawPayload: row.raw_payload as string,
      rawHeaders: row.raw_headers ? (typeof row.raw_headers === 'string' ? JSON.parse(row.raw_headers) : row.raw_headers as Record<string, string>) : undefined,
    };
  }
}

export class PgCanonicalTenderRepository implements CanonicalTenderRepository {
  constructor(private pool: Pool) {}

  async create(msg: CanonicalTenderMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.canonical_tenders (id, raw_transmission_id, shipment_id, load_id, carrier_id,
        tender_status, pickup_window_start, pickup_window_end, delivery_window_start, delivery_window_end,
        equipment_type, service_level, references, weight_lbs, pallet_count, piece_count, normalized_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [msg.id, msg.rawTransmissionId, msg.shipmentId, msg.loadId, msg.carrierId,
       msg.tenderStatus, msg.pickupWindowStart, msg.pickupWindowEnd,
       msg.deliveryWindowStart, msg.deliveryWindowEnd, msg.equipmentType,
       msg.serviceLevel, JSON.stringify(msg.references), msg.weightLbs,
       msg.palletCount, msg.pieceCount, msg.normalizedAt]
    );
  }
}

export class PgCanonicalStatusRepository implements CanonicalStatusRepository {
  constructor(private pool: Pool) {}

  async create(msg: CanonicalStatusMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.canonical_statuses (id, raw_transmission_id, shipment_id, load_id, carrier_id,
        event_code, event_reason_code, event_at, city, state, country, facility_id,
        latitude, longitude, eta_at, references, normalized_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [msg.id, msg.rawTransmissionId, msg.shipmentId, msg.loadId, msg.carrierId,
       msg.eventCode, msg.eventReasonCode, msg.eventAt, msg.city, msg.state,
       msg.country, msg.facilityId, msg.latitude, msg.longitude, msg.etaAt,
       JSON.stringify(msg.references), msg.normalizedAt]
    );
  }

  async existsByNaturalKey(key: string): Promise<boolean> {
    // Natural key is: shipmentId|loadId|eventCode|eventAt
    const parts = key.split('|');
    const shipmentId = parts[0] || null;
    const loadId = parts[1] || null;
    const eventCode = parts[2] || '';
    const eventAt = parts[3] || '';

    const { rows } = await this.pool.query(
      `SELECT 1 FROM tms.canonical_statuses
       WHERE COALESCE(shipment_id, '') = COALESCE($1, '')
         AND COALESCE(load_id, '') = COALESCE($2, '')
         AND event_code = $3
         AND event_at = $4
       LIMIT 1`,
      [shipmentId, loadId, eventCode, eventAt]
    );
    return rows.length > 0;
  }
}

export class PgCanonicalInvoiceRepository implements CanonicalInvoiceRepository {
  constructor(private pool: Pool) {}

  async create(msg: CanonicalInvoiceMessage): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO tms.canonical_invoices (id, raw_transmission_id, carrier_id, shipment_id, load_id,
          invoice_number, invoice_date, currency, total_amount, normalized_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [msg.id, msg.rawTransmissionId, msg.carrierId, msg.shipmentId, msg.loadId,
         msg.invoiceNumber, msg.invoiceDate, msg.currency, msg.totalAmount, msg.normalizedAt]
      );
      for (const charge of msg.charges) {
        await client.query(
          `INSERT INTO tms.canonical_invoice_charges (canonical_invoice_id, charge_code, description,
            amount, quantity, unit_of_measure)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [msg.id, charge.chargeCode, charge.description, charge.amount,
           charge.quantity, charge.unitOfMeasure]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export class PgTenderRepository implements TenderRepository {
  constructor(private pool: Pool) {}

  async create(tender: Tender): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.tenders (id, shipment_id, load_id, carrier_id, connection_type,
        outbound_document_type, status, tendered_at, responded_at, external_reference,
        response_code, response_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [tender.id, tender.shipmentId, tender.loadId, tender.carrierId,
       tender.connectionType, tender.outboundDocumentType, tender.status,
       tender.tenderedAt, tender.respondedAt, tender.externalReference,
       tender.responseCode, tender.responseMessage]
    );
  }

  async findById(id: string): Promise<Tender | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.tenders WHERE id = $1`, [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async updateStatus(id: string, status: TenderStatus, patch?: Partial<Tender>): Promise<void> {
    const sets: string[] = ['status = $2'];
    const params: unknown[] = [id, status];
    let idx = 3;

    if (patch?.respondedAt !== undefined) {
      sets.push(`responded_at = $${idx}`);
      params.push(patch.respondedAt);
      idx++;
    }
    if (patch?.responseCode !== undefined) {
      sets.push(`response_code = $${idx}`);
      params.push(patch.responseCode);
      idx++;
    }
    if (patch?.responseMessage !== undefined) {
      sets.push(`response_message = $${idx}`);
      params.push(patch.responseMessage);
      idx++;
    }
    if (patch?.externalReference !== undefined) {
      sets.push(`external_reference = $${idx}`);
      params.push(patch.externalReference);
      idx++;
    }

    await this.pool.query(
      `UPDATE tms.tenders SET ${sets.join(', ')} WHERE id = $1`,
      params
    );
  }

  private mapRow(row: Record<string, unknown>): Tender {
    return {
      id: row.id as string,
      shipmentId: row.shipment_id as string,
      loadId: row.load_id as string,
      carrierId: row.carrier_id as string,
      connectionType: row.connection_type as Tender['connectionType'],
      outboundDocumentType: row.outbound_document_type as Tender['outboundDocumentType'],
      status: row.status as TenderStatus,
      tenderedAt: (row.tendered_at as Date)?.toISOString?.() ?? row.tendered_at as string,
      respondedAt: row.responded_at ? ((row.responded_at as Date)?.toISOString?.() ?? row.responded_at as string) : undefined,
      externalReference: row.external_reference as string | undefined,
      responseCode: row.response_code as string | undefined,
      responseMessage: row.response_message as string | undefined,
    };
  }
}

export class PgTrackingEventRepository implements TrackingEventRepository {
  constructor(private pool: Pool) {}

  async create(event: TrackingEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.tracking_events (id, shipment_id, load_id, source, source_document_type,
        event_code, event_reason_code, event_at, city, state, country, facility_id,
        latitude, longitude, eta_at, raw_payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [event.id, event.shipmentId, event.loadId, event.source, event.sourceDocumentType,
       event.eventCode, event.eventReasonCode, event.eventAt, event.city, event.state,
       event.country, event.facilityId, event.latitude, event.longitude, event.etaAt,
       JSON.stringify(event.rawPayload)]
    );
  }

  async existsByNaturalKey(key: string): Promise<boolean> {
    const parts = key.split('|');
    const shipmentId = parts[0] || null;
    const loadId = parts[1] || null;
    const source = parts[2] || '';
    const sourceDocType = parts[3] || null;
    const eventCode = parts[4] || '';
    const eventAt = parts[5] || '';
    const city = parts[6] || null;
    const state = parts[7] || null;

    const { rows } = await this.pool.query(
      `SELECT 1 FROM tms.tracking_events
       WHERE COALESCE(shipment_id, '') = COALESCE($1, '')
         AND COALESCE(load_id, '') = COALESCE($2, '')
         AND source = $3
         AND COALESCE(source_document_type, '') = COALESCE($4, '')
         AND event_code = $5
         AND event_at = $6
         AND COALESCE(city, '') = COALESCE($7, '')
         AND COALESCE(state, '') = COALESCE($8, '')
       LIMIT 1`,
      [shipmentId, loadId, source, sourceDocType, eventCode, eventAt, city, state]
    );
    return rows.length > 0;
  }

  async getTrackingEventsForShipment(shipmentId: string): Promise<TrackingEvent[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.tracking_events WHERE shipment_id = $1 ORDER BY event_at`,
      [shipmentId]
    );
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): TrackingEvent {
    return {
      id: row.id as string,
      shipmentId: row.shipment_id as string | undefined,
      loadId: row.load_id as string | undefined,
      source: row.source as TrackingEvent['source'],
      sourceDocumentType: row.source_document_type as TrackingEvent['sourceDocumentType'],
      eventCode: row.event_code as string,
      eventReasonCode: row.event_reason_code as string | undefined,
      eventAt: (row.event_at as Date)?.toISOString?.() ?? row.event_at as string,
      city: row.city as string | undefined,
      state: row.state as string | undefined,
      country: row.country as string | undefined,
      facilityId: row.facility_id as string | undefined,
      latitude: row.latitude as number | undefined,
      longitude: row.longitude as number | undefined,
      etaAt: row.eta_at ? ((row.eta_at as Date)?.toISOString?.() ?? row.eta_at as string) : undefined,
      rawPayload: typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload,
    };
  }
}

export class PgMilestoneRepository implements MilestoneRepository {
  constructor(private pool: Pool) {}

  async create(milestone: Milestone): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.milestones (id, shipment_id, load_id, code, occurred_at, facility_id, source_event_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [milestone.id, milestone.shipmentId, milestone.loadId, milestone.code,
       milestone.occurredAt, milestone.facilityId, milestone.sourceEventId, milestone.notes]
    );
  }

  async getMilestonesForShipment(shipmentId: string): Promise<Milestone[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.milestones WHERE shipment_id = $1 ORDER BY occurred_at`,
      [shipmentId]
    );
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): Milestone {
    return {
      id: row.id as string,
      shipmentId: row.shipment_id as string,
      loadId: row.load_id as string | undefined,
      code: row.code as Milestone['code'],
      occurredAt: (row.occurred_at as Date)?.toISOString?.() ?? row.occurred_at as string,
      facilityId: row.facility_id as string | undefined,
      sourceEventId: row.source_event_id as string | undefined,
      notes: row.notes as string | undefined,
    };
  }
}

export class PgExceptionRepository implements ExceptionRepository {
  constructor(private pool: Pool) {}

  async create(exceptionCase: ExceptionCase): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.exceptions (id, shipment_id, load_id, category, code, severity, opened_at, resolved_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [exceptionCase.id, exceptionCase.shipmentId, exceptionCase.loadId,
       exceptionCase.category, exceptionCase.code, exceptionCase.severity,
       exceptionCase.openedAt, exceptionCase.resolvedAt, exceptionCase.notes]
    );
  }

  async existsOpenException(input: { shipmentId?: string; loadId?: string; code: string }): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM tms.exceptions
       WHERE resolved_at IS NULL
         AND code = $1
         AND COALESCE(shipment_id, '') = COALESCE($2, '')
         AND COALESCE(load_id, '') = COALESCE($3, '')
       LIMIT 1`,
      [input.code, input.shipmentId ?? null, input.loadId ?? null]
    );
    return rows.length > 0;
  }

  async getOpenExceptionsForShipment(shipmentId: string): Promise<Array<{ code: string; severity: string }>> {
    const { rows } = await this.pool.query(
      `SELECT code, severity FROM tms.exceptions
       WHERE resolved_at IS NULL AND shipment_id = $1`,
      [shipmentId]
    );
    return rows.map((r) => ({ code: r.code as string, severity: r.severity as string }));
  }
}

export class PgInvoiceRepository implements InvoiceRepository {
  constructor(private pool: Pool) {}

  async create(invoice: Invoice, charges: InvoiceCharge[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO tms.invoices (id, carrier_id, shipment_id, load_id, invoice_number,
          invoice_date, source, currency, subtotal_amount, accessorial_amount, total_amount, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [invoice.id, invoice.carrierId, invoice.shipmentId, invoice.loadId,
         invoice.invoiceNumber, invoice.invoiceDate, invoice.source, invoice.currency,
         invoice.subtotalAmount, invoice.accessorialAmount, invoice.totalAmount, invoice.status]
      );
      for (const charge of charges) {
        await client.query(
          `INSERT INTO tms.invoice_charges (id, invoice_id, charge_code, description,
            amount, quantity, unit_of_measure, approved, dispute_reason)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [charge.id, charge.invoiceId, charge.chargeCode, charge.description,
           charge.amount, charge.quantity, charge.unitOfMeasure, charge.approved,
           charge.disputeReason]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findByInvoiceNumber(carrierId: string, invoiceNumber: string): Promise<Invoice | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.invoices WHERE carrier_id = $1 AND invoice_number = $2`,
      [carrierId, invoiceNumber]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  private mapRow(row: Record<string, unknown>): Invoice {
    return {
      id: row.id as string,
      carrierId: row.carrier_id as string,
      shipmentId: row.shipment_id as string | undefined,
      loadId: row.load_id as string | undefined,
      invoiceNumber: row.invoice_number as string,
      invoiceDate: (row.invoice_date as Date)?.toISOString?.() ?? row.invoice_date as string,
      source: row.source as Invoice['source'],
      currency: row.currency as string,
      subtotalAmount: Number(row.subtotal_amount),
      accessorialAmount: Number(row.accessorial_amount),
      totalAmount: Number(row.total_amount),
      status: row.status as Invoice['status'],
    };
  }
}

export class PgShipmentRepository {
  constructor(private pool: Pool) {}

  async create(shipment: Shipment): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.shipments (id, shipment_number, leg_type, origin_facility_id, destination_facility_id,
        pickup_customer_id, consignee_id, status, service_level, piece_count, pallet_count, weight_lbs,
        cube_ft, references, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [shipment.id, shipment.shipmentNumber, shipment.legType, shipment.originFacilityId,
       shipment.destinationFacilityId, shipment.pickupCustomerId, shipment.consigneeId,
       shipment.status, shipment.serviceLevel, shipment.pieceCount, shipment.palletCount,
       shipment.weightLbs, shipment.cubeFt, JSON.stringify(shipment.references),
       shipment.createdAt, shipment.updatedAt]
    );
  }

  async findById(id: string): Promise<Shipment | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.shipments WHERE id = $1`, [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAll(): Promise<Shipment[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.shipments`);
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): Shipment {
    return {
      id: row.id as string,
      shipmentNumber: row.shipment_number as string,
      legType: row.leg_type as Shipment['legType'],
      originFacilityId: row.origin_facility_id as string | undefined,
      destinationFacilityId: row.destination_facility_id as string | undefined,
      pickupCustomerId: row.pickup_customer_id as string | undefined,
      consigneeId: row.consignee_id as string | undefined,
      status: row.status as Shipment['status'],
      serviceLevel: row.service_level as string | undefined,
      pieceCount: Number(row.piece_count),
      palletCount: Number(row.pallet_count),
      weightLbs: Number(row.weight_lbs),
      cubeFt: row.cube_ft != null ? Number(row.cube_ft) : undefined,
      references: typeof row.references === 'string' ? JSON.parse(row.references) : (row.references as Record<string, string>) ?? {},
      createdAt: (row.created_at as Date)?.toISOString?.() ?? row.created_at as string,
      updatedAt: (row.updated_at as Date)?.toISOString?.() ?? row.updated_at as string,
    };
  }
}

export class PgLoadRepository {
  constructor(private pool: Pool) {}

  async create(load: Load): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.loads (id, load_number, shipment_ids, carrier_id, trailer_id, truck_id,
        origin_stop_id, destination_stop_id, status, planned_departure_at, planned_arrival_at,
        actual_departure_at, actual_arrival_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [load.id, load.loadNumber, JSON.stringify(load.shipmentIds), load.carrierId,
       load.trailerId, load.truckId, load.originStopId, load.destinationStopId,
       load.status, load.plannedDepartureAt, load.plannedArrivalAt,
       load.actualDepartureAt, load.actualArrivalAt]
    );
  }

  async findById(id: string): Promise<Load | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.loads WHERE id = $1`, [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAll(): Promise<Load[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.loads`);
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): Load {
    const shipmentIds = typeof row.shipment_ids === 'string'
      ? JSON.parse(row.shipment_ids)
      : (row.shipment_ids as string[]);
    return {
      id: row.id as string,
      loadNumber: row.load_number as string,
      shipmentIds,
      carrierId: row.carrier_id as string | undefined,
      trailerId: row.trailer_id as string | undefined,
      truckId: row.truck_id as string | undefined,
      originStopId: row.origin_stop_id as string,
      destinationStopId: row.destination_stop_id as string,
      status: row.status as Load['status'],
      plannedDepartureAt: row.planned_departure_at ? ((row.planned_departure_at as Date)?.toISOString?.() ?? row.planned_departure_at as string) : undefined,
      plannedArrivalAt: row.planned_arrival_at ? ((row.planned_arrival_at as Date)?.toISOString?.() ?? row.planned_arrival_at as string) : undefined,
      actualDepartureAt: row.actual_departure_at ? ((row.actual_departure_at as Date)?.toISOString?.() ?? row.actual_departure_at as string) : undefined,
      actualArrivalAt: row.actual_arrival_at ? ((row.actual_arrival_at as Date)?.toISOString?.() ?? row.actual_arrival_at as string) : undefined,
    };
  }
}

export class PgFacilityRepository {
  constructor(private pool: Pool) {}

  async create(facility: Facility): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.facilities (id, code, type, acts_as_last_mile_spoke, timezone)
       VALUES ($1,$2,$3,$4,$5)`,
      [facility.id, facility.code, facility.type, facility.actsAsLastMileSpoke, facility.timezone]
    );
  }

  async findById(id: string): Promise<Facility | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.facilities WHERE id = $1`, [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAll(): Promise<Facility[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.facilities`);
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): Facility {
    return {
      id: row.id as string,
      code: row.code as string,
      type: row.type as Facility['type'],
      actsAsLastMileSpoke: row.acts_as_last_mile_spoke as boolean,
      timezone: row.timezone as string,
    };
  }
}

export class PgTradingPartnerRepository {
  constructor(private pool: Pool) {}

  async create(partner: TradingPartner): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.trading_partners (id, name, partner_code, protocol, enabled, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [partner.id, partner.name, partner.partnerCode, partner.protocol,
       partner.enabled, partner.metadata ? JSON.stringify(partner.metadata) : null]
    );
  }

  async findById(id: string): Promise<TradingPartner | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.trading_partners WHERE id = $1`, [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAll(): Promise<TradingPartner[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.trading_partners`);
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): TradingPartner {
    return {
      id: row.id as string,
      name: row.name as string,
      partnerCode: row.partner_code as string,
      protocol: row.protocol as TradingPartner['protocol'],
      enabled: row.enabled as boolean,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata as Record<string, string>) : undefined,
    };
  }
}

export class PgExpectedChargeRepository implements ExpectedChargeRepository {
  constructor(private pool: Pool) {}

  async getExpectedForLoadOrShipment(input: {
    loadId?: string;
    shipmentId?: string;
    carrierId: string;
  }): Promise<{
    linehaul?: number;
    fuel?: number;
    approvedAccessorials: Record<string, number>;
  }> {
    const conditions: string[] = ['carrier_id = $1'];
    const params: unknown[] = [input.carrierId];
    let idx = 2;

    if (input.loadId) {
      conditions.push(`load_id = $${idx}`);
      params.push(input.loadId);
      idx++;
    }
    if (input.shipmentId) {
      conditions.push(`shipment_id = $${idx}`);
      params.push(input.shipmentId);
      idx++;
    }

    const { rows } = await this.pool.query(
      `SELECT charge_code, amount FROM tms.expected_charges WHERE ${conditions.join(' AND ')}`,
      params
    );

    let linehaul: number | undefined;
    let fuel: number | undefined;
    const approvedAccessorials: Record<string, number> = {};

    for (const row of rows) {
      const code = row.charge_code as string;
      const amount = Number(row.amount);
      if (code === 'LINEHAUL') linehaul = amount;
      else if (code === 'FSC') fuel = amount;
      else approvedAccessorials[code] = amount;
    }

    return { linehaul, fuel, approvedAccessorials };
  }
}

export class PgRoutePlanRepository implements RoutePlanRepository {
  constructor(private pool: Pool) {}

  async getPlannedTransitMinutes(input: {
    originFacilityId?: string;
    destinationFacilityId?: string;
    legType?: string;
  }): Promise<number | null> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.originFacilityId) {
      conditions.push(`origin_facility_id = $${idx}`);
      params.push(input.originFacilityId);
      idx++;
    }
    if (input.destinationFacilityId) {
      conditions.push(`destination_facility_id = $${idx}`);
      params.push(input.destinationFacilityId);
      idx++;
    }
    if (input.legType) {
      conditions.push(`leg_type = $${idx}`);
      params.push(input.legType);
      idx++;
    }

    if (conditions.length === 0) return null;

    const { rows } = await this.pool.query(
      `SELECT planned_transit_minutes FROM tms.route_plans WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params
    );

    return rows.length > 0 ? Number(rows[0].planned_transit_minutes) : null;
  }
}

export class PgOpsDashboardQueryRepository implements OpsDashboardQueryRepository {
  constructor(private pool: Pool) {}

  async countOpenTenders(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM tms.tenders WHERE status IN ('TRANSMITTED', 'TECH_ACK_RECEIVED')`
    );
    return rows[0].count;
  }

  async countAcceptedTenders(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM tms.tenders WHERE status = 'ACCEPTED'`
    );
    return rows[0].count;
  }

  async countRejectedTenders(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM tms.tenders WHERE status = 'REJECTED'`
    );
    return rows[0].count;
  }

  async countInTransitShipments(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM tms.shipments WHERE status = 'IN_TRANSIT'`
    );
    return rows[0].count;
  }

  async countDelayedShipments(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM tms.shipments WHERE status = 'EXCEPTION'`
    );
    return rows[0].count;
  }

  async countOpenInvoiceDisputes(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM tms.invoices WHERE status = 'DISPUTED'`
    );
    return rows[0].count;
  }

  async getOpsShipments(): Promise<OpsShipmentRow[]> {
    const { rows } = await this.pool.query(
      `SELECT
        s.id AS shipment_id,
        s.leg_type,
        s.status AS current_status,
        COALESCE(of_fac.code, s.pickup_customer_id) AS origin,
        COALESCE(df_fac.code, s.consignee_id) AS destination,
        l.id AS load_id,
        l.carrier_id AS carrier,
        l.planned_arrival_at,
        EXISTS (
          SELECT 1 FROM tms.exceptions e
          WHERE e.resolved_at IS NULL AND e.shipment_id = s.id
        ) AS has_exceptions
       FROM tms.shipments s
       LEFT JOIN LATERAL (
         SELECT id, carrier_id, planned_arrival_at
         FROM tms.loads
         WHERE shipment_ids::jsonb ? s.id
         LIMIT 1
       ) l ON true
       LEFT JOIN tms.facilities of_fac ON of_fac.id = s.origin_facility_id
       LEFT JOIN tms.facilities df_fac ON df_fac.id = s.destination_facility_id`
    );

    return rows.map((r) => ({
      shipmentId: r.shipment_id as string,
      loadId: r.load_id as string | undefined,
      legType: r.leg_type as string | undefined,
      currentStatus: r.current_status as string,
      origin: r.origin as string | undefined,
      destination: r.destination as string | undefined,
      carrier: r.carrier as string | undefined,
      plannedArrivalAt: r.planned_arrival_at
        ? ((r.planned_arrival_at as Date)?.toISOString?.() ?? r.planned_arrival_at as string)
        : undefined,
      hasExceptions: r.has_exceptions as boolean,
    }));
  }
}

export class PgTrackingQueryRepository implements TrackingQueryRepository {
  constructor(private pool: Pool) {}

  async getTrackingEventsForShipment(shipmentId: string): Promise<TrackingEvent[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.tracking_events WHERE shipment_id = $1 ORDER BY event_at`,
      [shipmentId]
    );
    return rows.map(this.mapTrackingRow);
  }

  async getMilestonesForShipment(shipmentId: string): Promise<Milestone[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.milestones WHERE shipment_id = $1 ORDER BY occurred_at`,
      [shipmentId]
    );
    return rows.map(this.mapMilestoneRow);
  }

  async getOpenExceptionsForShipment(shipmentId: string): Promise<Array<{ code: string; severity: string }>> {
    const { rows } = await this.pool.query(
      `SELECT code, severity FROM tms.exceptions
       WHERE resolved_at IS NULL AND shipment_id = $1`,
      [shipmentId]
    );
    return rows.map((r) => ({ code: r.code as string, severity: r.severity as string }));
  }

  private mapTrackingRow(row: Record<string, unknown>): TrackingEvent {
    return {
      id: row.id as string,
      shipmentId: row.shipment_id as string | undefined,
      loadId: row.load_id as string | undefined,
      source: row.source as TrackingEvent['source'],
      sourceDocumentType: row.source_document_type as TrackingEvent['sourceDocumentType'],
      eventCode: row.event_code as string,
      eventReasonCode: row.event_reason_code as string | undefined,
      eventAt: (row.event_at as Date)?.toISOString?.() ?? row.event_at as string,
      city: row.city as string | undefined,
      state: row.state as string | undefined,
      country: row.country as string | undefined,
      facilityId: row.facility_id as string | undefined,
      latitude: row.latitude as number | undefined,
      longitude: row.longitude as number | undefined,
      etaAt: row.eta_at ? ((row.eta_at as Date)?.toISOString?.() ?? row.eta_at as string) : undefined,
      rawPayload: typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload,
    };
  }

  private mapMilestoneRow(row: Record<string, unknown>): Milestone {
    return {
      id: row.id as string,
      shipmentId: row.shipment_id as string,
      loadId: row.load_id as string | undefined,
      code: row.code as Milestone['code'],
      occurredAt: (row.occurred_at as Date)?.toISOString?.() ?? row.occurred_at as string,
      facilityId: row.facility_id as string | undefined,
      sourceEventId: row.source_event_id as string | undefined,
      notes: row.notes as string | undefined,
    };
  }
}
