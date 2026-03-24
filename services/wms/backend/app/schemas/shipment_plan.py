from pydantic import BaseModel


class ShipmentPlanBase(BaseModel):
    source_facility: str
    destination_fc: str
    ship_mode: str = "LTL"
    requested_ship_date: str | None = None
    lane_id: int | None = None


class ShipmentPlanCreate(ShipmentPlanBase):
    pass


class ShipmentPlanRead(ShipmentPlanBase):
    id: int
    status: str
    amazon_inbound_plan_id: str | None = None

    model_config = {"from_attributes": True}
