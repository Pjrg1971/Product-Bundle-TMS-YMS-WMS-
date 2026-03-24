from pydantic import BaseModel


class DockAppointmentCreate(BaseModel):
    shipment_id: int
    door_id: str | None = None
    scheduled_start: str | None = None
    scheduled_end: str | None = None
    trailer_number: str | None = None


class DockAppointmentRead(DockAppointmentCreate):
    id: int
    carrier_arrival_status: str
    status: str

    model_config = {"from_attributes": True}
