/**
 * ReceiveMethod — Enumeration of how a trailer's freight was received.
 *
 * TMS_AUTO_ARRIVAL:
 *   Default method. The trailer had a validated manifest (ASN/EDI/API)
 *   and all freight was auto-consumed into WMS as RECEIVED_ON_DOCK.
 *
 * MANUAL_SCAN_OVERRIDE:
 *   Fallback only. Used when no manifest exists, the manifest failed
 *   validation, or the manifest was incomplete. Requires an override
 *   reason and forces the dock worker into the manual scan workflow.
 */
export enum ReceiveMethod {
  TMS_AUTO_ARRIVAL     = 'TMS_AUTO_ARRIVAL',
  MANUAL_SCAN_OVERRIDE = 'MANUAL_SCAN_OVERRIDE',
}

/**
 * ManifestSource — Where the manifest data originated.
 * Maps to the TMS/middleware provider that supplied it.
 */
export enum ManifestSource {
  SHIPPO       = 'SHIPPO',
  SHIPIUM      = 'SHIPIUM',
  SHIPSTATION  = 'SHIPSTATION',
  EDI_204      = 'EDI_204',      // EDI Motor Carrier Load Tender
  EDI_856      = 'EDI_856',      // EDI Advance Ship Notice
  EDI_214      = 'EDI_214',      // EDI Transportation Carrier Shipment Status
  API_DIRECT   = 'API_DIRECT',   // Direct shipper API push
  MANUAL_ENTRY = 'MANUAL_ENTRY', // Manually keyed by ops (rare)
}

/**
 * TrailerStatus — Lifecycle states for an inbound trailer.
 */
export enum TrailerStatus {
  EXPECTED      = 'EXPECTED',      // TMS says trailer is en route
  AT_GATE       = 'AT_GATE',       // Checked in at yard gate
  DOCKED        = 'DOCKED',        // Backed into a dock door
  ARRIVED       = 'ARRIVED',       // Freight received (this feature)
  UNLOADING     = 'UNLOADING',     // Active unload in progress
  COMPLETE      = 'COMPLETE',      // Fully unloaded + released
  DEPARTED      = 'DEPARTED',      // Left the yard
}

/**
 * PackageStatus — WMS status for individual parcels/pallets.
 */
export enum PackageStatus {
  IN_TRANSIT        = 'IN_TRANSIT',
  RECEIVED_ON_DOCK  = 'RECEIVED_ON_DOCK',
  IN_PUTAWAY        = 'IN_PUTAWAY',
  STOWED            = 'STOWED',
  DAMAGED           = 'DAMAGED',
  SHORT             = 'SHORT',
}
