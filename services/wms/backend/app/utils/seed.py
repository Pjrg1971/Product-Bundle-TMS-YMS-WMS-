from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Item, Lane


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if not db.query(Item).count():
        db.add_all(
            [
                Item(sku="SKU-1001", description="Sample Item 1", asin="B000TEST01"),
                Item(sku="SKU-1002", description="Sample Item 2", asin="B000TEST02"),
            ]
        )
    if not db.query(Lane).count():
        db.add_all(
            [
                Lane(code="LAX8-ONT8", origin_facility="LAX8", destination_fc="ONT8", cadence_type="DAILY"),
                Lane(code="LAX8-SMF3", origin_facility="LAX8", destination_fc="SMF3", cadence_type="MULTI_WEEKLY"),
            ]
        )
    db.commit()
    db.close()


if __name__ == "__main__":
    run()
