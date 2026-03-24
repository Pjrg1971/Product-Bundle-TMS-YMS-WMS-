from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin


class Shipment(Base, TimestampMixin):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    shipment_plan_id: Mapped[int] = mapped_column(ForeignKey("shipment_plans.id"), index=True)
    amazon_shipment_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ship_to_fc_code: Mapped[str] = mapped_column(String(64), index=True)
    mode: Mapped[str] = mapped_column(String(16), default="LTL")
    status: Mapped[str] = mapped_column(String(32), default="PLANNED")
    bol_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pro_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    carrier_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    scac: Mapped[str | None] = mapped_column(String(16), nullable=True)
    carton_count: Mapped[int] = mapped_column(Integer, default=0)
    pallet_count: Mapped[int] = mapped_column(Integer, default=0)
    piece_count: Mapped[int] = mapped_column(Integer, default=0)
    gross_weight_lb: Mapped[float] = mapped_column(Float, default=0)
    cube_ft3: Mapped[float] = mapped_column(Float, default=0)

    shipment_plan = relationship("ShipmentPlan")
