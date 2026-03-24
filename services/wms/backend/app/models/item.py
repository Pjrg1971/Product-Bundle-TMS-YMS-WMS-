from sqlalchemy import Boolean, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin


class Item(Base, TimestampMixin):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    asin: Mapped[str | None] = mapped_column(String(32), nullable=True)
    fnsku: Mapped[str | None] = mapped_column(String(32), nullable=True)
    msku: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(String(255))
    unit_weight_lb: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit_length_in: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit_width_in: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit_height_in: Mapped[float | None] = mapped_column(Float, nullable=True)
    prep_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    label_owner: Mapped[str | None] = mapped_column(String(32), nullable=True)
    prep_owner: Mapped[str | None] = mapped_column(String(32), nullable=True)
    hazmat_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    fragile_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    active_flag: Mapped[bool] = mapped_column(Boolean, default=True)
