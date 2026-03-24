"""
Event handlers for WMS - processes events from TMS and YMS.
"""
import logging

logger = logging.getLogger(__name__)


async def handle_dock_assigned(payload: dict):
    """When YMS assigns a dock door, create/update WMS dock appointment."""
    logger.info(f"Dock assigned event: {payload}")
    # TODO: Create dock appointment from YMS dock assignment


async def handle_shipment_tendered(payload: dict):
    """When TMS tenders a shipment, check if WMS needs to prepare."""
    logger.info(f"Shipment tendered event: {payload}")
    # TODO: Create receiving plan from TMS tender
