import crypto from "node:crypto";
import {
  Invoice,
  InvoiceCharge,
  CanonicalInvoiceMessage,
  InvoiceAuditResult,
} from "../types";
import {
  InvoiceRepository,
  ShipmentCostRepository,
  ExpectedChargeRepository,
} from "../types/ports";

export class BillingService {
  constructor(
    private readonly invoiceRepo: InvoiceRepository,
    private readonly shipmentCostRepo: ShipmentCostRepository
  ) {}

  async ingest210(invoice: Invoice, charges: InvoiceCharge[]): Promise<Invoice> {
    const duplicate = await this.invoiceRepo.findByInvoiceNumber(invoice.carrierId, invoice.invoiceNumber);
    if (duplicate) throw new Error(`Duplicate invoice: ${invoice.invoiceNumber}`);

    const expected = await this.shipmentCostRepo.getExpectedCharges(invoice.loadId, invoice.shipmentId);
    let disputed = false;

    for (const charge of charges) {
      if (charge.chargeCode === "LINEHAUL" && charge.amount !== expected.linehaul) {
        charge.approved = false;
        charge.disputeReason = "LINEHAUL_MISMATCH";
        disputed = true;
      } else if (charge.chargeCode === "FSC" && charge.amount !== expected.fuel) {
        charge.approved = false;
        charge.disputeReason = "FUEL_MISMATCH";
        disputed = true;
      } else if (charge.chargeCode !== "LINEHAUL" && charge.chargeCode !== "FSC") {
        const approvedAmount = expected.approvedAccessorials[charge.chargeCode];
        if (approvedAmount === undefined || approvedAmount !== charge.amount) {
          charge.approved = false;
          charge.disputeReason = "ACCESSORIAL_NOT_APPROVED";
          disputed = true;
        } else {
          charge.approved = true;
        }
      } else {
        charge.approved = true;
      }
    }

    invoice.status = disputed ? "DISPUTED" : "APPROVED";
    await this.invoiceRepo.create(invoice, charges);
    return invoice;
  }
}

export class InvoiceAuditService {
  constructor(private readonly expectedChargeRepo: ExpectedChargeRepository) {}

  async audit(canonical: CanonicalInvoiceMessage): Promise<InvoiceAuditResult> {
    const expected = await this.expectedChargeRepo.getExpectedForLoadOrShipment({
      loadId: canonical.loadId,
      shipmentId: canonical.shipmentId,
      carrierId: canonical.carrierId,
    });

    const reasons: string[] = [];

    const charges: InvoiceCharge[] = canonical.charges.map((c) => {
      const record: InvoiceCharge = {
        id: crypto.randomUUID(),
        invoiceId: canonical.id,
        chargeCode: c.chargeCode,
        description: c.description,
        amount: c.amount,
        quantity: c.quantity,
        unitOfMeasure: c.unitOfMeasure,
        approved: true,
      };

      if (c.chargeCode === "LINEHAUL" && expected.linehaul !== undefined && c.amount !== expected.linehaul) {
        record.approved = false;
        record.disputeReason = "LINEHAUL_MISMATCH";
        reasons.push("LINEHAUL_MISMATCH");
      } else if (c.chargeCode === "FSC" && expected.fuel !== undefined && c.amount !== expected.fuel) {
        record.approved = false;
        record.disputeReason = "FUEL_MISMATCH";
        reasons.push("FUEL_MISMATCH");
      } else if (c.chargeCode !== "LINEHAUL" && c.chargeCode !== "FSC") {
        const allowed = expected.approvedAccessorials[c.chargeCode];
        if (allowed === undefined || allowed !== c.amount) {
          record.approved = false;
          record.disputeReason = "ACCESSORIAL_NOT_APPROVED";
          reasons.push(`ACCESSORIAL_NOT_APPROVED:${c.chargeCode}`);
        }
      }

      return record;
    });

    const passed = reasons.length === 0;
    const subtotal = charges.reduce((sum, c) => sum + c.amount, 0);
    const invoice: Invoice = {
      id: canonical.id,
      carrierId: canonical.carrierId,
      shipmentId: canonical.shipmentId,
      loadId: canonical.loadId,
      invoiceNumber: canonical.invoiceNumber,
      invoiceDate: canonical.invoiceDate,
      source: "EDI_210",
      currency: canonical.currency,
      subtotalAmount: subtotal,
      accessorialAmount: charges
        .filter((c) => c.chargeCode !== "LINEHAUL" && c.chargeCode !== "FSC")
        .reduce((sum, c) => sum + c.amount, 0),
      totalAmount: canonical.totalAmount,
      status: passed ? "APPROVED" : "DISPUTED",
    };

    return { invoice, charges, passed, reasons };
  }
}
