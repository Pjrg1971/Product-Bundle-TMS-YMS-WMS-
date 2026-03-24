import { Tender } from "../types";
import { TenderRepository, EdiGateway, ApiCarrierGateway, Clock } from "../types/ports";

export class TenderService {
  constructor(
    private readonly tenderRepo: TenderRepository,
    private readonly ediGateway: EdiGateway,
    private readonly apiCarrierGateway: ApiCarrierGateway,
    private readonly clock: Clock
  ) {}

  async sendEdi204(tender: Tender, ediPayload: unknown): Promise<void> {
    const result = await this.ediGateway.send204(ediPayload);
    await this.tenderRepo.create({
      ...tender,
      status: "TRANSMITTED",
      outboundDocumentType: "204",
      tenderedAt: tender.tenderedAt || this.clock.nowIso(),
      externalReference: result.controlNumber,
    });
  }

  async sendApiTender(tender: Tender, apiPayload: unknown): Promise<void> {
    const result = await this.apiCarrierGateway.createTender(apiPayload);
    await this.tenderRepo.create({
      ...tender,
      status: result.accepted ? "ACCEPTED" : "TRANSMITTED",
      tenderedAt: tender.tenderedAt || this.clock.nowIso(),
      externalReference: result.externalReference,
    });
  }

  async apply997(tenderId: string): Promise<void> {
    await this.tenderRepo.updateStatus(tenderId, "TECH_ACK_RECEIVED");
  }

  async apply990(tenderId: string, accepted: boolean, responseMessage?: string): Promise<void> {
    await this.tenderRepo.updateStatus(tenderId, accepted ? "ACCEPTED" : "REJECTED", {
      respondedAt: this.clock.nowIso(),
      responseCode: accepted ? "A" : "D",
      responseMessage,
    });
  }
}
