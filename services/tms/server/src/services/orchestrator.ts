import { RawTransmission, TrackingEvent } from "../types";
import { TransmissionIngestionService } from "./ingestion-service";
import { TrackingService } from "./tracking-service";
import { ExceptionEngine } from "./exception-engine";

export class TmsOrchestratorService {
  constructor(
    private readonly ingestionService: TransmissionIngestionService,
    private readonly trackingService: TrackingService,
    private readonly exceptionEngine: ExceptionEngine
  ) {}

  async ingestRawTransmission(tx: RawTransmission): Promise<void> {
    await this.ingestionService.ingest(tx);
  }

  async applyNormalizedStatusToTracking(event: TrackingEvent): Promise<void> {
    await this.trackingService.ingest(event);
    await this.exceptionEngine.evaluate(event);
  }
}
