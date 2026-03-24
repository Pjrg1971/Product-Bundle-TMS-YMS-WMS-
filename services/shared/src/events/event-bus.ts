import { Client } from 'pg';
import { getPool } from '../db/pool';

export interface IntegrationEvent {
  id: string;
  event_type: string;
  source: string;
  payload: Record<string, unknown>;
}

type EventHandler = (event: IntegrationEvent) => Promise<void>;

const handlers = new Map<string, EventHandler[]>();
let listenerClient: Client | null = null;

export function onEvent(eventType: string, handler: EventHandler): void {
  const existing = handlers.get(eventType) || [];
  existing.push(handler);
  handlers.set(eventType, existing);
}

export async function startEventListener(): Promise<void> {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cowork_logistics';
  listenerClient = new Client({ connectionString });
  await listenerClient.connect();
  await listenerClient.query('LISTEN integration_events');

  listenerClient.on('notification', async (msg) => {
    if (msg.channel !== 'integration_events' || !msg.payload) return;
    try {
      const event: IntegrationEvent = JSON.parse(msg.payload);
      const eventHandlers = handlers.get(event.event_type) || [];
      const wildcardHandlers = handlers.get('*') || [];
      for (const handler of [...eventHandlers, ...wildcardHandlers]) {
        try {
          await handler(event);
        } catch (err) {
          console.error(`[EventBus] Handler error for ${event.event_type}:`, err);
        }
      }
    } catch (err) {
      console.error('[EventBus] Parse error:', err);
    }
  });

  console.log('[EventBus] Listening for integration_events');
}

export async function publishEvent(
  eventType: string,
  source: 'TMS' | 'WMS' | 'YMS' | 'GATEWAY',
  payload: Record<string, unknown>
): Promise<string> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT shared.publish_event($1, $2, $3) as id`,
    [eventType, source, JSON.stringify(payload)]
  );
  return result.rows[0].id;
}

export async function stopEventListener(): Promise<void> {
  if (listenerClient) {
    await listenerClient.end();
    listenerClient = null;
  }
}
