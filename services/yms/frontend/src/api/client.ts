import type {
  GateEntry,
  DockDoor,
  YardSpot,
  MessageChannel,
  Message,
  AuditEntry,
  CreateGateEntry,
  DockDoorAssignment,
  YardSpotAssignment,
  TrailerMove,
} from '../types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const BASE = '/api/yms';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('yms_token');
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Gate Log                                                           */
/* ------------------------------------------------------------------ */

export function getGateLog(params?: {
  status?: string;
  direction?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: GateEntry[]; count: number | null }> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.direction) q.set('direction', params.direction);
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  const qs = q.toString();
  return request(`/gate${qs ? `?${qs}` : ''}`);
}

export function createGateEntry(entry: CreateGateEntry): Promise<GateEntry> {
  return request('/gate', { method: 'POST', body: JSON.stringify(entry) });
}

export function updateGateEntry(
  id: string,
  updates: Partial<GateEntry>,
): Promise<GateEntry> {
  return request(`/gate/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function checkoutGateEntry(id: string): Promise<GateEntry> {
  return request(`/gate/${id}/checkout`, { method: 'POST' });
}

export function deleteGateEntry(id: string): Promise<{ success: boolean }> {
  return request(`/gate/${id}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ */
/*  Dock Doors                                                         */
/* ------------------------------------------------------------------ */

export function getDockDoors(): Promise<DockDoor[]> {
  return request('/dock-doors');
}

export function updateDockDoor(
  id: string,
  updates: Partial<DockDoor>,
): Promise<DockDoor> {
  return request(`/dock-doors/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function assignDockDoor(
  id: string,
  assignment: DockDoorAssignment,
): Promise<DockDoor> {
  return request(`/dock-doors/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify(assignment),
  });
}

export function clearDockDoor(id: string): Promise<DockDoor> {
  return request(`/dock-doors/${id}/clear`, { method: 'POST' });
}

/* ------------------------------------------------------------------ */
/*  Yard Spots                                                         */
/* ------------------------------------------------------------------ */

export function getYardSpots(zone?: string): Promise<YardSpot[]> {
  const qs = zone ? `?zone=${zone}` : '';
  return request(`/yard-spots${qs}`);
}

export function updateYardSpot(
  id: string,
  updates: Partial<YardSpot>,
): Promise<YardSpot> {
  return request(`/yard-spots/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function assignYardSpot(
  id: string,
  assignment: YardSpotAssignment,
): Promise<YardSpot> {
  return request(`/yard-spots/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify(assignment),
  });
}

export function clearYardSpot(id: string): Promise<YardSpot> {
  return request(`/yard-spots/${id}/clear`, { method: 'POST' });
}

export function moveTrailer(move: TrailerMove): Promise<{ success: boolean; destination: unknown }> {
  return request('/yard-spots/move', { method: 'POST', body: JSON.stringify(move) });
}

/* ------------------------------------------------------------------ */
/*  Messages                                                           */
/* ------------------------------------------------------------------ */

export function getChannels(): Promise<MessageChannel[]> {
  return request('/messages/channels');
}

export function getMessages(channelId: string): Promise<Message[]> {
  return request(`/messages/${channelId}`);
}

export function sendMessage(
  channelId: string,
  msg: { text: string; sender: string; incoming?: boolean },
): Promise<Message> {
  return request(`/messages/${channelId}`, { method: 'POST', body: JSON.stringify(msg) });
}

/* ------------------------------------------------------------------ */
/*  Audit Log                                                          */
/* ------------------------------------------------------------------ */

export function getAuditLog(params?: {
  limit?: number;
  offset?: number;
  entityType?: string;
  action?: string;
  userId?: string;
}): Promise<AuditEntry[]> {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  if (params?.entityType) q.set('entityType', params.entityType);
  if (params?.action) q.set('action', params.action);
  if (params?.userId) q.set('userId', params.userId);
  const qs = q.toString();
  return request(`/audit${qs ? `?${qs}` : ''}`);
}

/* ------------------------------------------------------------------ */
/*  Health                                                             */
/* ------------------------------------------------------------------ */

export function getHealth(): Promise<{ status: string }> {
  return request('/health');
}
