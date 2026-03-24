import { EtaComputationInput } from "../types";
import { RoutePlanRepository } from "../types/ports";

export class EtaService {
  constructor(private readonly routePlanRepo: RoutePlanRepository) {}

  async computeEta(input: EtaComputationInput): Promise<string | null> {
    const plannedMinutes = await this.routePlanRepo.getPlannedTransitMinutes({
      originFacilityId: input.originFacilityId,
      destinationFacilityId: input.destinationFacilityId,
      legType: input.legType,
    });

    if (!plannedMinutes || !input.lastKnownEvent) return null;

    const eventAtMs = new Date(input.lastKnownEvent.eventAt).getTime();

    if (
      input.lastKnownEvent.eventCode === "IN_TRANSIT_FIRST_MILE" ||
      input.lastKnownEvent.eventCode === "IN_TRANSIT_MIDDLE_MILE" ||
      input.lastKnownEvent.eventCode === "LINEHAUL_IN_TRANSIT" ||
      input.lastKnownEvent.eventCode === "DEPARTED_PICKUP" ||
      input.lastKnownEvent.eventCode === "DEPARTED_FACILITY"
    ) {
      return new Date(eventAtMs + plannedMinutes * 60 * 1000).toISOString();
    }

    return null;
  }
}
