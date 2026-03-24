from pydantic import BaseModel


class ItemBase(BaseModel):
    sku: str
    description: str
    asin: str | None = None
    fnsku: str | None = None
    msku: str | None = None
    unit_weight_lb: float | None = None
    unit_length_in: float | None = None
    unit_width_in: float | None = None
    unit_height_in: float | None = None
    prep_category: str | None = None
    label_owner: str | None = None
    prep_owner: str | None = None
    hazmat_flag: bool = False
    fragile_flag: bool = False
    active_flag: bool = True


class ItemCreate(ItemBase):
    pass


class ItemRead(ItemBase):
    id: int

    model_config = {"from_attributes": True}
