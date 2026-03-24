import { onEvent, IntegrationEvent, getPool } from '@cowork/shared';

export function registerEventHandlers(): void {
  // When TMS tenders a shipment, create WMS shipment plan
  onEvent('shipment.tendered', async (event: IntegrationEvent) => {
    console.log(`[Gateway] Shipment tendered: ${JSON.stringify(event.payload)}`);
    // Create cross-reference entry
    const pool = getPool();
    await pool.query(
      `INSERT INTO shared.shipment_xref (tms_shipment_id, carrier_id)
       VALUES ($1, $2::UUID)
       ON CONFLICT DO NOTHING`,
      [event.payload.shipment_id, event.payload.carrier_id]
    );
  });

  // When YMS detects trailer arrival, log tracking event in TMS
  onEvent('trailer.arrived', async (event: IntegrationEvent) => {
    console.log(`[Gateway] Trailer arrived: ${JSON.stringify(event.payload)}`);
  });

  // When dock is assigned in YMS, update WMS dock appointment
  onEvent('dock.assigned', async (event: IntegrationEvent) => {
    console.log(`[Gateway] Dock assigned: ${JSON.stringify(event.payload)}`);
  });

  // When WMS packs a shipment, update TMS tracking
  onEvent('shipment.packed', async (event: IntegrationEvent) => {
    console.log(`[Gateway] Shipment packed: ${JSON.stringify(event.payload)}`);
  });

  // When trailer departs from YMS, update TMS tracking
  onEvent('trailer.departed', async (event: IntegrationEvent) => {
    console.log(`[Gateway] Trailer departed: ${JSON.stringify(event.payload)}`);
  });

  // Wildcard handler for logging
  onEvent('*', async (event: IntegrationEvent) => {
    console.log(`[EventBus] ${event.event_type} from ${event.source}`);
  });
}
