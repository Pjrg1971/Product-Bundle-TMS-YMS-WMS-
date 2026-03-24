from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.shipment_plan import ShipmentPlan
from app.schemas.shipment_plan import ShipmentPlanCreate, ShipmentPlanRead
from app.services.amazon_connector import AmazonConnectorService

router = APIRouter()
amazon = AmazonConnectorService()


@router.get("", response_model=list[ShipmentPlanRead])
def list_shipment_plans(db: Session = Depends(get_db)):
    return db.query(ShipmentPlan).order_by(ShipmentPlan.id.desc()).all()


@router.post("", response_model=ShipmentPlanRead, status_code=201)
def create_shipment_plan(payload: ShipmentPlanCreate, db: Session = Depends(get_db)):
    plan = ShipmentPlan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/{shipment_plan_id}/amazon-inbound", response_model=ShipmentPlanRead)
def create_amazon_inbound_plan(shipment_plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(ShipmentPlan).filter(ShipmentPlan.id == shipment_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Shipment plan not found")
    result = amazon.create_inbound_plan(shipment_plan_id)
    plan.amazon_inbound_plan_id = result["amazon_inbound_plan_id"]
    plan.status = "AMAZON_PLAN_CREATED"
    db.commit()
    db.refresh(plan)
    return plan
