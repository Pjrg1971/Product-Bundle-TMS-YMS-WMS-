from pydantic import BaseModel


class ShipmentBase(BaseModel):
    shipment_plan_id: int
    ship_to_fc_code: str
    mode: str = "LTL"
    carrier_name: str | None = None
    scac: str | None = None


class ShipmentCreate(ShipmentBase):
    pass


class ShipmentRead(ShipmentBase):
    id: int
    amazon_shipment_id: str | None = None
    status: str
    bol_number: str | None = None
    pro_number: str | None = None
    carton_count: int
    pallet_count: int
    piece_count: int
    gross_weight_lb: float
    cube_ft3: float

    model_config = {"from_attributes": True}


class ShipmentTrackingUpdate(BaseModel):
    carrier_name: str | None = None
    scac: str | None = None
    pro_number: str | None = None
    bol_number: str | None = None
