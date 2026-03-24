from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.lane import Lane
from app.schemas.lane import LaneCreate, LaneRead

router = APIRouter()


@router.get("", response_model=list[LaneRead])
def list_lanes(db: Session = Depends(get_db)):
    return db.query(Lane).order_by(Lane.id.desc()).all()


@router.post("", response_model=LaneRead, status_code=201)
def create_lane(payload: LaneCreate, db: Session = Depends(get_db)):
    existing = db.query(Lane).filter(Lane.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Lane code already exists")
    lane = Lane(**payload.model_dump())
    db.add(lane)
    db.commit()
    db.refresh(lane)
    return lane
