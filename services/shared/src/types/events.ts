export const EVENT_TYPES = {
  SHIPMENT_TENDERED: 'shipment.tendered',
  TRAILER_ARRIVED: 'trailer.arrived',
  DOCK_ASSIGNED: 'dock.assigned',
  SHIPMENT_PACKED: 'shipment.packed',
  TRAILER_DEPARTED: 'trailer.departed',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

export interface ShipmentTenderedPayload {
  shipment_id: string;
  shipment_number: string;
  carrier_id: string;
}

export interface TrailerArrivedPayload {
  gate_log_id: string;
  trailer_id: string;
  direction: string;
  trucking_company: string;
  arrival: string;
}

export interface DockAssignedPayload {
  dock_door_id: string;
  door_number: number;
  type: string;
  trailer: string;
  driver: string;
  company: string;
}

export interface ShipmentPackedPayload {
  wms_shipment_id: number;
  shipment_number: string;
  carton_count: number;
  pallet_count: number;
  gross_weight_lb: number;
}

export interface TrailerDepartedPayload {
  gate_log_id: string;
  trailer_id: string;
  departure: string;
  direction: string;
}
