/**
 * Cross-system event integration for YMS
 * Publishes events to shared.integration_events via PostgreSQL NOTIFY
 */
const { createClient } = require('@supabase/supabase-js');

async function publishEvent(supabase, eventType, payload) {
  const { data, error } = await supabase.rpc('publish_event_yms', {
    p_event_type: eventType,
    p_source: 'YMS',
    p_payload: payload,
  });

  if (error) {
    console.error(`[YMS Events] Failed to publish ${eventType}:`, error);
    return null;
  }
  return data;
}

module.exports = { publishEvent };
