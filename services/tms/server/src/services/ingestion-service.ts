import { RawTransmission } from "../types";
import { RawTransmissionRepository, Clock } from "../types/ports";
import { NormalizationPipeline } from "../normalizers";

export class TransmissionIngestionService {
  constructor(
    private readonly rawTxRepo: RawTransmissionRepository,
    private readonly pipeline: NormalizationPipeline,
    private readonly clock: Clock
  ) {}

  async ingest(tx: RawTransmission): Promise<void> {
    const duplicate = await this.rawTxRepo.existsByControlNumbers({
      tradingPartnerId: tx.tradingPartnerId,
      interchangeControlNumber: tx.interchangeControlNumber,
      groupControlNumber: tx.groupControlNumber,
      transactionSetControlNumber: tx.transactionSetControlNumber,
      externalReference: tx.externalReference,
    });

    if (duplicate) return;

    await this.rawTxRepo.create(tx);

    try {
      await this.rawTxRepo.updateStatus(tx.id, "PARSED");
      await this.pipeline.run(tx);
      await this.rawTxRepo.updateStatus(tx.id, "PROCESSED", { processedAt: this.clock.nowIso() });
    } catch (error) {
      await this.rawTxRepo.updateStatus(tx.id, "FAILED", {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}
