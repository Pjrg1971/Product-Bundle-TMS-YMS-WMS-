from typing import Any


class AmazonConnectorService:
    """Stub integration layer for Amazon FBA inbound API workflows."""

    def create_inbound_plan(self, shipment_plan_id: int) -> dict[str, Any]:
        return {
            "shipment_plan_id": shipment_plan_id,
            "amazon_inbound_plan_id": f"AIP-{shipment_plan_id:06d}",
            "status": "CREATED",
        }

    def sync_tracking(self, shipment_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return {"shipment_id": shipment_id, "status": "TRACKING_SYNCED", "payload": payload}
