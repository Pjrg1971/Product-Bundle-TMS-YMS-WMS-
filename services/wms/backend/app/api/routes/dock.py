from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.dock import DockAppointment
from app.models.shipment import Shipment
from app.schemas.dock import DockAppointmentCreate, DockAppointmentRead

router = APIRouter()


@router.get("/appointments", response_model=list[DockAppointmentRead])
def list_appointments(db: Session = Depends(get_db)):
    return db.query(DockAppointment).order_by(DockAppointment.id.desc()).all()


@router.post("/appointments", response_model=DockAppointmentRead, status_code=201)
def create_appointment(payload: DockAppointmentCreate, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == payload.shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    appointment = DockAppointment(**payload.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment
