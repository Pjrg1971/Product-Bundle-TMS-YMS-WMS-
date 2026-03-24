from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin


class DockAppointment(Base, TimestampMixin):
    __tablename__ = "dock_appointments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id"), index=True)
    door_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    scheduled_start: Mapped[str | None] = mapped_column(String(64), nullable=True)
    scheduled_end: Mapped[str | None] = mapped_column(String(64), nullable=True)
    trailer_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    carrier_arrival_status: Mapped[str] = mapped_column(String(32), default="PENDING")
    status: Mapped[str] = mapped_column(String(32), default="REQUESTED")

    shipment = relationship("Shipment")
