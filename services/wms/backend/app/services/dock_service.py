from typing import Any


class DockService:
    def create_load_payload(self, shipment: Any) -> dict[str, Any]:
        return {
            "shipment_id": shipment.id,
            "destination_fc": shipment.ship_to_fc_code,
            "mode": shipment.mode,
            "carton_count": shipment.carton_count,
            "pallet_count": shipment.pallet_count,
            "piece_count": shipment.piece_count,
            "gross_weight_lb": shipment.gross_weight_lb,
            "cube_ft3": shipment.cube_ft3,
            "carrier_name": shipment.carrier_name,
            "scac": shipment.scac,
            "bol_number": shipment.bol_number,
            "pro_number": shipment.pro_number,
        }
