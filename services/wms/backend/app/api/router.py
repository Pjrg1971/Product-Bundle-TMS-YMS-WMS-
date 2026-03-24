from fastapi import APIRouter

from app.api.routes import dock, items, lanes, shipment_plans, shipments

api_router = APIRouter()
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(lanes.router, prefix="/lanes", tags=["lanes"])
api_router.include_router(shipment_plans.router, prefix="/shipment-plans", tags=["shipment-plans"])
api_router.include_router(shipments.router, prefix="/shipments", tags=["shipments"])
api_router.include_router(dock.router, prefix="/dock", tags=["dock"])
