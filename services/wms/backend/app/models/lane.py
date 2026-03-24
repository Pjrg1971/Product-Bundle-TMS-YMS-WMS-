from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin


class Lane(Base, TimestampMixin):
    __tablename__ = "lanes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    origin_facility: Mapped[str] = mapped_column(String(64), index=True)
    destination_fc: Mapped[str] = mapped_column(String(64), index=True)
    cadence_type: Mapped[str] = mapped_column(String(32), default="DAILY")
    target_departure_days: Mapped[str | None] = mapped_column(String(64), nullable=True)
    service_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    mode_default: Mapped[str] = mapped_column(String(16), default="LTL")
