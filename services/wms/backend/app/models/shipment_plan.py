from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin


class ShipmentPlan(Base, TimestampMixin):
    __tablename__ = "shipment_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    source_facility: Mapped[str] = mapped_column(String(64), index=True)
    destination_fc: Mapped[str] = mapped_column(String(64), index=True)
    ship_mode: Mapped[str] = mapped_column(String(16), default="LTL")
    requested_ship_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="DRAFT")
    amazon_inbound_plan_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    lane_id: Mapped[int | None] = mapped_column(ForeignKey("lanes.id"), nullable=True)

    lane = relationship("Lane")
