"""
Cross-system event publisher for WMS.
Publishes events to the shared.integration_events table via PostgreSQL NOTIFY.
"""
import json
from sqlalchemy.orm import Session
from sqlalchemy import text


def publish_event(db: Session, event_type: str, payload: dict) -> str:
    """Publish an integration event to the shared event bus."""
    result = db.execute(
        text("SELECT shared.publish_event(:event_type, 'WMS', :payload::jsonb) as id"),
        {"event_type": event_type, "payload": json.dumps(payload)}
    )
    db.commit()
    row = result.fetchone()
    return str(row[0]) if row else ""
