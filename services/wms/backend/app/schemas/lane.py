from pydantic import BaseModel


class LaneBase(BaseModel):
    code: str
    origin_facility: str
    destination_fc: str
    cadence_type: str = "DAILY"
    target_departure_days: str | None = None
    service_level: str | None = None
    mode_default: str = "LTL"


class LaneCreate(LaneBase):
    pass


class LaneRead(LaneBase):
    id: int

    model_config = {"from_attributes": True}
