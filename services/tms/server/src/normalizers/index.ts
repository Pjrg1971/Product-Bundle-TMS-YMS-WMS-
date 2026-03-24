import {
  RawTransmission,
  NormalizedMessage,
  CanonicalTenderMessage,
  CanonicalStatusMessage,
  CanonicalInvoiceMessage,
} from "../types";
import {
  IdFactory,
  Clock,
  MessageNormalizer,
  CanonicalTenderRepository,
  CanonicalStatusRepository,
  CanonicalInvoiceRepository,
  RawTransmissionRepository,
} from "../types/ports";

/* =========================================================
 * Normalization Pipeline
 * ========================================================= */

export class NormalizationPipeline {
  constructor(
    private readonly normalizers: MessageNormalizer[],
    private readonly canonicalTenderRepo: CanonicalTenderRepository,
    private readonly canonicalStatusRepo: CanonicalStatusRepository,
    private readonly canonicalInvoiceRepo: CanonicalInvoiceRepository,
    private readonly rawTxRepo: RawTransmissionRepository,
    private readonly clock: Clock
  ) {}

  async run(tx: RawTransmission): Promise<NormalizedMessage> {
    const normalizer = this.normalizers.find((n) => n.supports(tx));
    if (!normalizer) {
      await this.rawTxRepo.updateStatus(tx.id, "FAILED", {
        errorMessage: `No normalizer found for ${tx.protocol}:${tx.documentType}`,
      });
      throw new Error(`No normalizer found for ${tx.protocol}:${tx.documentType}`);
    }

    const normalized = await normalizer.normalize(tx);

    if (normalized.kind === "TENDER") {
      await this.canonicalTenderRepo.create(normalized.data);
    } else if (normalized.kind === "STATUS") {
      await this.canonicalStatusRepo.create(normalized.data);
    } else if (normalized.kind === "INVOICE") {
      await this.canonicalInvoiceRepo.create(normalized.data);
    }

    await this.rawTxRepo.updateStatus(tx.id, "NORMALIZED", {
      processedAt: this.clock.nowIso(),
    });

    return normalized;
  }
}

/* =========================================================
 * Individual Normalizers
 * ========================================================= */

export class Edi204Normalizer implements MessageNormalizer {
  constructor(private readonly ids: IdFactory, private readonly clock: Clock) {}

  supports(tx: RawTransmission): boolean {
    return tx.protocol === "EDI" && tx.documentType === "204";
  }

  async normalize(tx: RawTransmission): Promise<NormalizedMessage> {
    const payload = JSON.parse(tx.rawPayload);
    return {
      kind: "TENDER",
      data: {
        id: this.ids.next(),
        rawTransmissionId: tx.id,
        shipmentId: payload.shipmentId,
        loadId: payload.loadId,
        carrierId: payload.carrierId,
        tenderStatus: "TRANSMITTED",
        pickupWindowStart: payload.pickupWindowStart,
        pickupWindowEnd: payload.pickupWindowEnd,
        deliveryWindowStart: payload.deliveryWindowStart,
        deliveryWindowEnd: payload.deliveryWindowEnd,
        equipmentType: payload.equipmentType,
        serviceLevel: payload.serviceLevel,
        references: payload.references ?? {},
        weightLbs: payload.weightLbs,
        palletCount: payload.palletCount,
        pieceCount: payload.pieceCount,
        normalizedAt: this.clock.nowIso(),
      },
    };
  }
}

export class Edi990Normalizer implements MessageNormalizer {
  constructor(private readonly ids: IdFactory, private readonly clock: Clock) {}

  supports(tx: RawTransmission): boolean {
    return tx.protocol === "EDI" && tx.documentType === "990";
  }

  async normalize(tx: RawTransmission): Promise<NormalizedMessage> {
    const payload = JSON.parse(tx.rawPayload);
    return {
      kind: "STATUS",
      data: {
        id: this.ids.next(),
        rawTransmissionId: tx.id,
        shipmentId: payload.shipmentId,
        loadId: payload.loadId,
        carrierId: payload.carrierId,
        eventCode: payload.accepted ? "990_ACCEPTED" : "990_REJECTED",
        eventAt: payload.eventAt ?? this.clock.nowIso(),
        references: payload.references ?? {},
        normalizedAt: this.clock.nowIso(),
      },
    };
  }
}

export class Edi214Normalizer implements MessageNormalizer {
  constructor(private readonly ids: IdFactory, private readonly clock: Clock) {}

  supports(tx: RawTransmission): boolean {
    return tx.protocol === "EDI" && tx.documentType === "214";
  }

  async normalize(tx: RawTransmission): Promise<NormalizedMessage> {
    const payload = JSON.parse(tx.rawPayload);
    return {
      kind: "STATUS",
      data: {
        id: this.ids.next(),
        rawTransmissionId: tx.id,
        shipmentId: payload.shipmentId,
        loadId: payload.loadId,
        carrierId: payload.carrierId,
        eventCode: payload.eventCode,
        eventReasonCode: payload.reasonCode,
        eventAt: payload.eventAt,
        city: payload.city,
        state: payload.state,
        country: payload.country,
        facilityId: payload.facilityId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        etaAt: payload.etaAt,
        references: payload.references ?? {},
        normalizedAt: this.clock.nowIso(),
      },
    };
  }
}

export class Edi997Normalizer implements MessageNormalizer {
  constructor(private readonly ids: IdFactory, private readonly clock: Clock) {}

  supports(tx: RawTransmission): boolean {
    return tx.protocol === "EDI" && tx.documentType === "997";
  }

  async normalize(tx: RawTransmission): Promise<NormalizedMessage> {
    const payload = JSON.parse(tx.rawPayload);
    return {
      kind: "STATUS",
      data: {
        id: this.ids.next(),
        rawTransmissionId: tx.id,
        shipmentId: payload.shipmentId,
        loadId: payload.loadId,
        carrierId: payload.carrierId,
        eventCode: "997_ACCEPTED",
        eventReasonCode: payload.ackCode,
        eventAt: payload.eventAt ?? this.clock.nowIso(),
        references: payload.references ?? {},
        normalizedAt: this.clock.nowIso(),
      },
    };
  }
}

export class Edi210Normalizer implements MessageNormalizer {
  constructor(private readonly ids: IdFactory, private readonly clock: Clock) {}

  supports(tx: RawTransmission): boolean {
    return tx.protocol === "EDI" && tx.documentType === "210";
  }

  async normalize(tx: RawTransmission): Promise<NormalizedMessage> {
    const payload = JSON.parse(tx.rawPayload);
    return {
      kind: "INVOICE",
      data: {
        id: this.ids.next(),
        rawTransmissionId: tx.id,
        carrierId: payload.carrierId,
        shipmentId: payload.shipmentId,
        loadId: payload.loadId,
        invoiceNumber: payload.invoiceNumber,
        invoiceDate: payload.invoiceDate,
        currency: payload.currency ?? "USD",
        totalAmount: payload.totalAmount,
        normalizedAt: this.clock.nowIso(),
        charges: payload.charges ?? [],
      },
    };
  }
}

export class ApiStatusWebhookNormalizer implements MessageNormalizer {
  constructor(private readonly ids: IdFactory, private readonly clock: Clock) {}

  supports(tx: RawTransmission): boolean {
    return tx.protocol === "API" && tx.documentType === "status_webhook";
  }

  async normalize(tx: RawTransmission): Promise<NormalizedMessage> {
    const payload = JSON.parse(tx.rawPayload);
    return {
      kind: "STATUS",
      data: {
        id: this.ids.next(),
        rawTransmissionId: tx.id,
        shipmentId: payload.shipmentId,
        loadId: payload.loadId,
        carrierId: payload.carrierId,
        eventCode: payload.eventCode,
        eventReasonCode: payload.reasonCode,
        eventAt: payload.eventAt,
        city: payload.location?.city,
        state: payload.location?.state,
        country: payload.location?.country,
        facilityId: payload.facilityId,
        latitude: payload.location?.latitude,
        longitude: payload.location?.longitude,
        etaAt: payload.etaAt,
        references: payload.references ?? {},
        normalizedAt: this.clock.nowIso(),
      },
    };
  }
}
