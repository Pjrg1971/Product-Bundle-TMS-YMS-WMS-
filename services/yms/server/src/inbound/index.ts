/**
 * Radixx Inbound Arrival Module
 *
 * TMS-driven trailer arrival for the Radixx YMS/TMS/WMS workflow.
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                     Scanner UI / Desktop UI                 │
 *   │                    "Arrive Trailer" button                  │
 *   └──────────────────────────┬──────────────────────────────────┘
 *                              │ POST /api/inbound/arrive
 *                              ▼
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │               InboundArrivalController                      │
 *   │         Validates request, extracts auth context             │
 *   └──────────────────────────┬──────────────────────────────────┘
 *                              │
 *                              ▼
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │               TrailerArrivalService                         │
 *   │   1. Idempotency check (ArrivalAuditRepository)             │
 *   │   2. Manifest lookup (ManifestRepository)                   │
 *   │   3. TMS query if no local manifest (TmsAdapter)            │
 *   │   4. Manifest validation (ManifestValidationService)        │
 *   │   5a. Valid → auto-arrive → push to WMS (WmsAdapter)        │
 *   │   5b. Invalid → manual scan fallback (no WMS push)          │
 *   │   6. Create audit record (ArrivalAuditRepository)           │
 *   │   7. Publish event (EventPublisher)                         │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Key business rules:
 *   - TMS-driven auto-arrival is the DEFAULT receive method
 *   - Manual scan is OVERRIDE ONLY (no manifest or invalid manifest)
 *   - Arrival is IDEMPOTENT (duplicate clicks return existing record)
 *   - WMS only receives freight when manifest is validated
 *   - Every arrival creates an immutable audit record
 */

// Models
export {
  ReceiveMethod,
  ManifestSource,
  TrailerStatus,
  PackageStatus,
} from './models/ReceiveMethod';

export type {
  TrailerManifest,
  ManifestPackage,
  ManifestValidationError,
  CreateManifestInput,
} from './models/TrailerManifest';

export type {
  TrailerArrivalAudit,
  ArriveTrailerRequest,
  ArriveTrailerResponse,
  ManualScanContext,
} from './models/TrailerArrival';

// Services
export { TrailerArrivalService } from './services/TrailerArrivalService';
export type { InboundArrivalEvent, IEventPublisher, TrailerArrivalServiceConfig } from './services/TrailerArrivalService';
export { ManifestValidationService } from './services/ManifestValidationService';

// Repositories (interfaces)
export type { IManifestRepository, ManifestLookupParams } from './repositories/ManifestRepository';
export type { IArrivalAuditRepository, CreateArrivalAuditInput } from './repositories/ArrivalAuditRepository';

// Adapters (interfaces)
export type {
  ITmsAdapter,
  ICompositeTmsAdapter,
  TmsLookupParams,
  TmsTrailerData,
  TmsLookupResult,
} from './adapters/TmsAdapter';

export type {
  IWmsAdapter,
  WmsReceiptItem,
  WmsBatchReceiptRequest,
  WmsReceiptConfirmation,
  WmsBatchReceiptResponse,
} from './adapters/WmsAdapter';

export type {
  IShipmentFeedAdapter,
  RawShipmentFeed,
  ParsedShipmentFeed,
} from './adapters/ShipmentFeedAdapter';

// Controller
export { InboundArrivalController } from './controllers/InboundArrivalController';

// Routes
export { createInboundArrivalRouter } from './routes/inbound-arrival';
