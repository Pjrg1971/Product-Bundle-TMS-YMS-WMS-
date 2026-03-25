const BASE = '/api/tms';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface ShipmentTimeline {
  shipmentId: string;
  loadId: string;
  currentStatus: string;
  lastEventAt: string;
  etaAt: string;
  milestones: { code: string; occurredAt?: string; facilityId?: string; notes?: string }[];
  hasExceptions: boolean;
}

export const api = {
  getShipmentTimeline: (id: string) => request<ShipmentTimeline>(`/shipments/${id}/timeline`),
  getShipments: () => request<any[]>('/shipments'),
};
