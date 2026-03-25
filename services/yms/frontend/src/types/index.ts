/* ------------------------------------------------------------------ */
/*  Types matching the Supabase schema for YMS                        */
/* ------------------------------------------------------------------ */

export interface GateEntry {
  id: string;
  tenant_id: string;
  trailer_id: string;
  trailer_type: 'Dry Van' | 'Reefer' | 'Flatbed' | 'Tanker' | 'Container' | null;
  truck_number: string | null;
  driver_name: string;
  driver_license: string | null;
  driver_phone: string | null;
  trucking_company: string;
  customer: string | null;
  load_status: 'Full' | 'Partial' | 'Empty' | null;
  direction: 'Inbound' | 'Outbound';
  arrival: string;
  departure: string | null;
  seal_number: string | null;
  po_number: string | null;
  notes: string | null;
  status: 'On Site' | 'Departed';
  created_at: string;
  updated_at: string;
}

export interface DockDoor {
  id: string;
  tenant_id: string;
  number: number;
  type: 'Inbound' | 'Outbound';
  status: 'available' | 'occupied' | 'maintenance';
  current_trailer: string | null;
  current_driver: string | null;
  customer: string | null;
  company: string | null;
  load_status: 'Full' | 'Partial' | 'Empty' | null;
  assigned_since: string | null;
  updated_at: string;
}

export interface YardSpot {
  id: string;
  tenant_id: string;
  number: number;
  zone: 'A' | 'B' | 'C';
  status: 'empty' | 'occupied';
  trailer: string | null;
  trailer_type: 'Dry Van' | 'Reefer' | 'Flatbed' | 'Tanker' | 'Container' | null;
  load_status: 'Full' | 'Partial' | 'Empty' | null;
  company: string | null;
  customer: string | null;
  driver_name: string | null;
  parked_since: string | null;
  updated_at: string;
}

export interface MessageChannel {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Message {
  id: string;
  channel_id: string;
  sender: string;
  text: string;
  incoming: boolean;
  user_id: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  profiles?: { name: string; email: string } | null;
}

/* ---- Request DTOs ---- */

export interface CreateGateEntry {
  trailer_id: string;
  trailer_type?: string;
  truck_number?: string;
  driver_name: string;
  driver_license?: string;
  driver_phone?: string;
  trucking_company: string;
  customer?: string;
  load_status?: string;
  direction: 'Inbound' | 'Outbound';
  seal_number?: string;
  po_number?: string;
  notes?: string;
}

export interface DockDoorAssignment {
  trailer: string;
  driver: string;
  customer?: string;
  company?: string;
  loadStatus?: string;
}

export interface YardSpotAssignment {
  trailer: string;
  trailerType?: string;
  loadStatus?: string;
  company?: string;
  customer?: string;
  driverName?: string;
}

export interface TrailerMove {
  fromType: 'spot' | 'door';
  fromId: string;
  toType: 'spot' | 'door';
  toId: string;
}
