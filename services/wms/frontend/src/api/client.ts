const API_BASE = 'http://localhost:8000/api/v1'

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    throw new Error(`API error ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const apiClient = {
  listShipmentPlans: () => get<any[]>('/shipment-plans'),
  listShipments: () => get<any[]>('/shipments'),
  getShipment: (shipmentId: string) => get<any>(`/shipments/${shipmentId}`),
  listAppointments: () => get<any[]>('/dock/appointments'),
}
