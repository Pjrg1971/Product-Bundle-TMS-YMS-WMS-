from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.shipment import Shipment
from app.models.shipment_plan import ShipmentPlan
from app.schemas.shipment import ShipmentCreate, ShipmentRead, ShipmentTrackingUpdate
from app.services.amazon_connector import AmazonConnectorService
from app.services.dock_service import DockService

router = APIRouter()
amazon = AmazonConnectorService()
dock = DockService()


@router.get("", response_model=list[ShipmentRead])
def list_shipments(db: Session = Depends(get_db)):
    return db.query(Shipment).order_by(Shipment.id.desc()).all()


@router.post("", response_model=ShipmentRead, status_code=201)
def create_shipment(payload: ShipmentCreate, db: Session = Depends(get_db)):
    plan = db.query(ShipmentPlan).filter(ShipmentPlan.id == payload.shipment_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Shipment plan not found")
    shipment = Shipment(**payload.model_dump())
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


@router.get("/{shipment_id}", response_model=ShipmentRead)
def get_shipment(shipment_id: int, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


@router.post("/{shipment_id}/tracking", response_model=ShipmentRead)
def update_tracking(shipment_id: int, payload: ShipmentTrackingUpdate, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(shipment, key, value)
    shipment.status = "TRACKING_UPDATED"
    amazon.sync_tracking(shipment_id, payload.model_dump(exclude_none=True))
    db.commit()
    db.refresh(shipment)
    return shipment


@router.post("/{shipment_id}/dock-load")
def create_dock_load(shipment_id: int, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return dock.create_load_payload(shipment)
