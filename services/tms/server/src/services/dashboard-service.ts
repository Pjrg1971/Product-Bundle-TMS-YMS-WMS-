import { OpsDashboardView } from "../types";
import { OpsDashboardQueryRepository } from "../types/ports";

export class OpsDashboardService {
  constructor(private readonly repo: OpsDashboardQueryRepository) {}

  async getDashboard(): Promise<OpsDashboardView> {
    const [
      openTenders,
      acceptedTenders,
      rejectedTenders,
      inTransit,
      delayed,
      invoiceDisputes,
      shipments,
    ] = await Promise.all([
      this.repo.countOpenTenders(),
      this.repo.countAcceptedTenders(),
      this.repo.countRejectedTenders(),
      this.repo.countInTransitShipments(),
      this.repo.countDelayedShipments(),
      this.repo.countOpenInvoiceDisputes(),
      this.repo.getOpsShipments(),
    ]);

    return {
      cards: [
        { label: "Open Tenders", count: openTenders },
        { label: "Accepted Tenders", count: acceptedTenders },
        { label: "Rejected Tenders", count: rejectedTenders },
        { label: "In Transit", count: inTransit },
        { label: "Delayed", count: delayed },
        { label: "Invoice Disputes", count: invoiceDisputes },
      ],
      shipments,
    };
  }
}
