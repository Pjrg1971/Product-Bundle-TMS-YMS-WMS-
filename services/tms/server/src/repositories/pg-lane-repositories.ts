import { Pool } from 'pg';
import type {
  LocationRecord,
  LaneMaster,
  LaneSchedule,
  LaneTiming,
  LaneCarrier,
  LaneCarrierAssignment,
  LaneRate,
  LaneSla,
  ReferenceConfig,
  LiveAsset,
  LiveAssetPosition,
  GeoFence,
  GeoFenceEvent,
} from '../types/lanes';

/* =========================================================
 * PostgreSQL Lane Repository Implementations
 * ========================================================= */

export class PgLocationRepository {
  constructor(private pool: Pool) {}

  async upsert(row: LocationRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.locations (location_id, name, street_address, city, state, zip,
        location_type, notes, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (location_id) DO UPDATE SET
        name = EXCLUDED.name, street_address = EXCLUDED.street_address,
        city = EXCLUDED.city, state = EXCLUDED.state, zip = EXCLUDED.zip,
        location_type = EXCLUDED.location_type, notes = EXCLUDED.notes,
        latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude`,
      [row.locationId, row.name, row.streetAddress, row.city, row.state, row.zip,
       row.locationType, row.notes, row.latitude, row.longitude]
    );
  }

  async findAll(): Promise<LocationRecord[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.locations`);
    return rows.map(this.mapRow);
  }

  async findById(id: string): Promise<LocationRecord | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.locations WHERE location_id = $1`, [id]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
  }

  private mapRow(row: Record<string, unknown>): LocationRecord {
    return {
      locationId: row.location_id as string,
      name: row.name as string,
      streetAddress: row.street_address as string | null,
      city: row.city as string | null,
      state: row.state as string | null,
      zip: row.zip as string | null,
      locationType: row.location_type as string | null,
      notes: row.notes as string | null,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
    };
  }
}

export class PgLaneMasterRepository {
  constructor(private pool: Pool) {}

  async upsert(row: LaneMaster): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.lane_master (lane_id, mile_type, origin_location_id, dest_location_id,
        transit_hours, distance_miles, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (lane_id) DO UPDATE SET
        mile_type = EXCLUDED.mile_type, origin_location_id = EXCLUDED.origin_location_id,
        dest_location_id = EXCLUDED.dest_location_id, transit_hours = EXCLUDED.transit_hours,
        distance_miles = EXCLUDED.distance_miles, status = EXCLUDED.status`,
      [row.laneId, row.mileType, row.originLocationId, row.destLocationId,
       row.transitHours, row.distanceMiles, row.status]
    );
  }

  async findAll(): Promise<LaneMaster[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.lane_master`);
    return rows.map(this.mapRow);
  }

  async findById(id: string): Promise<LaneMaster | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_master WHERE lane_id = $1`, [id]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
  }

  private mapRow(row: Record<string, unknown>): LaneMaster {
    return {
      laneId: row.lane_id as string,
      mileType: row.mile_type as string,
      originLocationId: row.origin_location_id as string,
      destLocationId: row.dest_location_id as string,
      transitHours: row.transit_hours != null ? Number(row.transit_hours) : null,
      distanceMiles: row.distance_miles != null ? Number(row.distance_miles) : null,
      status: row.status as string | null,
    };
  }
}

export class PgLaneScheduleRepository {
  constructor(private pool: Pool) {}

  async replaceAll(rows: LaneSchedule[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM tms.lane_schedules`);
      for (const row of rows) {
        await client.query(
          `INSERT INTO tms.lane_schedules (lane_schedule_id, lane_id, day_of_week, is_active)
           VALUES ($1,$2,$3,$4)`,
          [row.laneScheduleId, row.laneId, row.dayOfWeek, row.isActive]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findByLane(laneId: string): Promise<LaneSchedule[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_schedules WHERE lane_id = $1`,
      [laneId]
    );
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): LaneSchedule {
    return {
      laneScheduleId: row.lane_schedule_id as string,
      laneId: row.lane_id as string,
      dayOfWeek: Number(row.day_of_week),
      isActive: row.is_active as boolean,
    };
  }
}

export class PgLaneTimingRepository {
  constructor(private pool: Pool) {}

  async upsert(row: LaneTiming): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.lane_timings (lane_timing_id, lane_id, mile_type, day_of_week,
        apt_time, cpt_time, cet_time, apt_cpt_offset_min)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (lane_timing_id) DO UPDATE SET
        lane_id = EXCLUDED.lane_id, mile_type = EXCLUDED.mile_type,
        day_of_week = EXCLUDED.day_of_week, apt_time = EXCLUDED.apt_time,
        cpt_time = EXCLUDED.cpt_time, cet_time = EXCLUDED.cet_time,
        apt_cpt_offset_min = EXCLUDED.apt_cpt_offset_min`,
      [row.laneTimingId, row.laneId, row.mileType, row.dayOfWeek,
       row.aptTime, row.cptTime, row.cetTime, row.aptCptOffsetMin]
    );
  }

  async findByLane(laneId: string): Promise<LaneTiming[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_timings WHERE lane_id = $1`,
      [laneId]
    );
    return rows.map(this.mapRow);
  }

  async findDefaultForLane(laneId: string): Promise<LaneTiming | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_timings WHERE lane_id = $1 AND day_of_week IS NULL LIMIT 1`,
      [laneId]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
  }

  private mapRow(row: Record<string, unknown>): LaneTiming {
    return {
      laneTimingId: row.lane_timing_id as string,
      laneId: row.lane_id as string,
      mileType: row.mile_type as string | null,
      dayOfWeek: row.day_of_week != null ? Number(row.day_of_week) : null,
      aptTime: row.apt_time as string | null,
      cptTime: row.cpt_time as string | null,
      cetTime: row.cet_time as string | null,
      aptCptOffsetMin: row.apt_cpt_offset_min != null ? Number(row.apt_cpt_offset_min) : null,
    };
  }
}

export class PgLaneCarrierRepository {
  constructor(private pool: Pool) {}

  async upsert(row: LaneCarrier): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.lane_carriers (carrier_id, carrier_name, scac, mc_number, dot_number,
        insurance_expiry, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (carrier_id) DO UPDATE SET
        carrier_name = EXCLUDED.carrier_name, scac = EXCLUDED.scac,
        mc_number = EXCLUDED.mc_number, dot_number = EXCLUDED.dot_number,
        insurance_expiry = EXCLUDED.insurance_expiry, status = EXCLUDED.status,
        notes = EXCLUDED.notes`,
      [row.carrierId, row.carrierName, row.scac, row.mcNumber, row.dotNumber,
       row.insuranceExpiry, row.status, row.notes]
    );
  }

  async findAll(): Promise<LaneCarrier[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.lane_carriers`);
    return rows.map(this.mapRow);
  }

  async findById(id: string): Promise<LaneCarrier | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_carriers WHERE carrier_id = $1`, [id]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
  }

  private mapRow(row: Record<string, unknown>): LaneCarrier {
    return {
      carrierId: row.carrier_id as string,
      carrierName: row.carrier_name as string,
      scac: row.scac as string | null,
      mcNumber: row.mc_number as string | null,
      dotNumber: row.dot_number as string | null,
      insuranceExpiry: row.insurance_expiry as string | null,
      status: row.status as string | null,
      notes: row.notes as string | null,
    };
  }
}

export class PgLaneCarrierAssignmentRepository {
  constructor(private pool: Pool) {}

  async upsert(row: LaneCarrierAssignment): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.lane_carrier_assignments (lane_carrier_id, lane_id, carrier_id,
        equipment_type, trailer_size, load_type, max_weight_lbs, max_pallets, temp_range, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (lane_carrier_id) DO UPDATE SET
        lane_id = EXCLUDED.lane_id, carrier_id = EXCLUDED.carrier_id,
        equipment_type = EXCLUDED.equipment_type, trailer_size = EXCLUDED.trailer_size,
        load_type = EXCLUDED.load_type, max_weight_lbs = EXCLUDED.max_weight_lbs,
        max_pallets = EXCLUDED.max_pallets, temp_range = EXCLUDED.temp_range,
        priority = EXCLUDED.priority`,
      [row.laneCarrierId, row.laneId, row.carrierId, row.equipmentType,
       row.trailerSize, row.loadType, row.maxWeightLbs, row.maxPallets,
       row.tempRange, row.priority]
    );
  }

  async findAll(): Promise<LaneCarrierAssignment[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.lane_carrier_assignments`);
    return rows.map(this.mapRow);
  }

  async findByLane(laneId: string): Promise<LaneCarrierAssignment[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_carrier_assignments WHERE lane_id = $1`,
      [laneId]
    );
    return rows.map(this.mapRow);
  }

  async findPrimaryForLane(laneId: string): Promise<LaneCarrierAssignment | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_carrier_assignments
       WHERE lane_id = $1 AND UPPER(priority) = 'PRIMARY' LIMIT 1`,
      [laneId]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
  }

  private mapRow(row: Record<string, unknown>): LaneCarrierAssignment {
    return {
      laneCarrierId: row.lane_carrier_id as string,
      laneId: row.lane_id as string,
      carrierId: row.carrier_id as string,
      equipmentType: row.equipment_type as string | null,
      trailerSize: row.trailer_size as string | null,
      loadType: row.load_type as string | null,
      maxWeightLbs: row.max_weight_lbs != null ? Number(row.max_weight_lbs) : null,
      maxPallets: row.max_pallets != null ? Number(row.max_pallets) : null,
      tempRange: row.temp_range as string | null,
      priority: row.priority as string | null,
    };
  }
}

export class PgLaneRateRepository {
  constructor(private pool: Pool) {}

  async upsert(row: LaneRate): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.lane_rates (rate_id, lane_id, carrier_id, rate_load, rate_mile,
        fuel_surcharge_pct, accessorials, rate_type, effective_date, expiration_date,
        version, is_current)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (rate_id) DO UPDATE SET
        lane_id = EXCLUDED.lane_id, carrier_id = EXCLUDED.carrier_id,
        rate_load = EXCLUDED.rate_load, rate_mile = EXCLUDED.rate_mile,
        fuel_surcharge_pct = EXCLUDED.fuel_surcharge_pct, accessorials = EXCLUDED.accessorials,
        rate_type = EXCLUDED.rate_type, effective_date = EXCLUDED.effective_date,
        expiration_date = EXCLUDED.expiration_date, version = EXCLUDED.version,
        is_current = EXCLUDED.is_current`,
      [row.rateId, row.laneId, row.carrierId, row.rateLoad, row.rateMile,
       row.fuelSurchargePct, row.accessorials, row.rateType, row.effectiveDate,
       row.expirationDate, row.version, row.isCurrent]
    );
  }

  async findAll(): Promise<LaneRate[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.lane_rates`);
    return rows.map(this.mapRow);
  }

  async findByLaneAndCarrier(laneId: string, carrierId: string): Promise<LaneRate[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_rates WHERE lane_id = $1 AND carrier_id = $2`,
      [laneId, carrierId]
    );
    return rows.map(this.mapRow);
  }

  async findCurrentForLaneCarrier(laneId: string, carrierId: string): Promise<LaneRate | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_rates
       WHERE lane_id = $1 AND carrier_id = $2 AND (is_current IS NULL OR is_current = true)
       LIMIT 1`,
      [laneId, carrierId]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
  }

  private mapRow(row: Record<string, unknown>): LaneRate {
    return {
      rateId: row.rate_id as string,
      laneId: row.lane_id as string,
      carrierId: row.carrier_id as string,
      rateLoad: row.rate_load != null ? Number(row.rate_load) : null,
      rateMile: row.rate_mile != null ? Number(row.rate_mile) : null,
      fuelSurchargePct: row.fuel_surcharge_pct != null ? Number(row.fuel_surcharge_pct) : null,
      accessorials: row.accessorials != null ? Number(row.accessorials) : null,
      rateType: row.rate_type as string | null,
      effectiveDate: row.effective_date as string | null,
      expirationDate: row.expiration_date as string | null,
      version: row.version != null ? Number(row.version) : null,
      isCurrent: row.is_current as boolean | null,
    };
  }
}

export class PgLaneSlaRepository {
  constructor(private pool: Pool) {}

  async upsert(row: LaneSla): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.lane_slas (sla_id, lane_id, ot_target, dwell_limit_min,
        effective_date, expiration_date, lane_owner, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (sla_id) DO UPDATE SET
        lane_id = EXCLUDED.lane_id, ot_target = EXCLUDED.ot_target,
        dwell_limit_min = EXCLUDED.dwell_limit_min, effective_date = EXCLUDED.effective_date,
        expiration_date = EXCLUDED.expiration_date, lane_owner = EXCLUDED.lane_owner,
        notes = EXCLUDED.notes`,
      [row.slaId, row.laneId, row.otTarget, row.dwellLimitMin,
       row.effectiveDate, row.expirationDate, row.laneOwner, row.notes]
    );
  }

  async findAll(): Promise<LaneSla[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.lane_slas`);
    return rows.map(this.mapRow);
  }

  async findByLane(laneId: string): Promise<LaneSla | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.lane_slas WHERE lane_id = $1 LIMIT 1`,
      [laneId]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
  }

  private mapRow(row: Record<string, unknown>): LaneSla {
    return {
      slaId: row.sla_id as string,
      laneId: row.lane_id as string,
      otTarget: row.ot_target != null ? Number(row.ot_target) : null,
      dwellLimitMin: row.dwell_limit_min != null ? Number(row.dwell_limit_min) : null,
      effectiveDate: row.effective_date as string | null,
      expirationDate: row.expiration_date as string | null,
      laneOwner: row.lane_owner as string | null,
      notes: row.notes as string | null,
    };
  }
}

export class PgReferenceConfigRepository {
  constructor(private pool: Pool) {}

  async replaceAll(rows: ReferenceConfig[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM tms.reference_configs`);
      for (const row of rows) {
        await client.query(
          `INSERT INTO tms.reference_configs (reference_config_id, config_type, code,
            display_name, sort_order, is_active)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [row.referenceConfigId, row.configType, row.code,
           row.displayName, row.sortOrder, row.isActive]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findByType(configType: string): Promise<ReferenceConfig[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.reference_configs WHERE config_type = $1 ORDER BY sort_order`,
      [configType]
    );
    return rows.map(this.mapRow);
  }

  async allTypes(): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT config_type FROM tms.reference_configs ORDER BY config_type`
    );
    return rows.map((r) => r.config_type as string);
  }

  private mapRow(row: Record<string, unknown>): ReferenceConfig {
    return {
      referenceConfigId: row.reference_config_id as string,
      configType: row.config_type as string,
      code: row.code as string,
      displayName: row.display_name as string,
      sortOrder: Number(row.sort_order),
      isActive: row.is_active as boolean,
    };
  }
}

export class PgLiveAssetRepository {
  constructor(private pool: Pool) {}

  async upsert(row: LiveAsset): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.live_assets (asset_id, asset_type, carrier_id, truck_id, trailer_id, driver_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (asset_id) DO UPDATE SET
        asset_type = EXCLUDED.asset_type, carrier_id = EXCLUDED.carrier_id,
        truck_id = EXCLUDED.truck_id, trailer_id = EXCLUDED.trailer_id,
        driver_id = EXCLUDED.driver_id, status = EXCLUDED.status`,
      [row.assetId, row.assetType, row.carrierId, row.truckId, row.trailerId,
       row.driverId, row.status]
    );
  }

  async findAll(): Promise<LiveAsset[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tms.live_assets`);
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): LiveAsset {
    return {
      assetId: row.asset_id as string,
      assetType: row.asset_type as LiveAsset['assetType'],
      carrierId: row.carrier_id as string | null,
      truckId: row.truck_id as string | null,
      trailerId: row.trailer_id as string | null,
      driverId: row.driver_id as string | null,
      status: row.status as string | null,
    };
  }
}

export class PgLiveAssetPositionRepository {
  constructor(private pool: Pool) {}

  async add(row: LiveAssetPosition): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.live_asset_positions (position_id, asset_id, shipment_id, load_id, lane_id,
        latitude, longitude, speed_mph, heading_degrees, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [row.positionId, row.assetId, row.shipmentId, row.loadId, row.laneId,
       row.latitude, row.longitude, row.speedMph, row.headingDegrees, row.recordedAt]
    );
  }

  async latestByAsset(assetId: string): Promise<LiveAssetPosition | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.live_asset_positions
       WHERE asset_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [assetId]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
  }

  async allLatest(): Promise<LiveAssetPosition[]> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT ON (asset_id) *
       FROM tms.live_asset_positions
       ORDER BY asset_id, recorded_at DESC`
    );
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): LiveAssetPosition {
    return {
      positionId: row.position_id as string,
      assetId: row.asset_id as string,
      shipmentId: row.shipment_id as string | null,
      loadId: row.load_id as string | null,
      laneId: row.lane_id as string | null,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      speedMph: row.speed_mph != null ? Number(row.speed_mph) : null,
      headingDegrees: row.heading_degrees != null ? Number(row.heading_degrees) : null,
      recordedAt: (row.recorded_at as Date)?.toISOString?.() ?? row.recorded_at as string,
    };
  }
}

export class PgGeoFenceRepository {
  constructor(private pool: Pool) {}

  async upsert(row: GeoFence): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.geo_fences (geo_fence_id, location_id, lane_id, fence_type, name,
        radius_meters, center_lat, center_lng, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (geo_fence_id) DO UPDATE SET
        location_id = EXCLUDED.location_id, lane_id = EXCLUDED.lane_id,
        fence_type = EXCLUDED.fence_type, name = EXCLUDED.name,
        radius_meters = EXCLUDED.radius_meters, center_lat = EXCLUDED.center_lat,
        center_lng = EXCLUDED.center_lng, is_active = EXCLUDED.is_active`,
      [row.geoFenceId, row.locationId, row.laneId, row.fenceType, row.name,
       row.radiusMeters, row.centerLat, row.centerLng, row.isActive]
    );
  }

  async findActive(): Promise<GeoFence[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.geo_fences WHERE is_active = true`
    );
    return rows.map(this.mapRow);
  }

  async findByLane(laneId: string): Promise<GeoFence[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.geo_fences WHERE lane_id = $1 AND is_active = true`,
      [laneId]
    );
    return rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): GeoFence {
    return {
      geoFenceId: row.geo_fence_id as string,
      locationId: row.location_id as string | null,
      laneId: row.lane_id as string | null,
      fenceType: row.fence_type as GeoFence['fenceType'],
      name: row.name as string,
      radiusMeters: row.radius_meters != null ? Number(row.radius_meters) : null,
      centerLat: row.center_lat != null ? Number(row.center_lat) : null,
      centerLng: row.center_lng != null ? Number(row.center_lng) : null,
      isActive: row.is_active as boolean,
    };
  }
}

export class PgGeoFenceEventRepository {
  constructor(private pool: Pool) {}

  async add(row: GeoFenceEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO tms.geo_fence_events (geo_fence_event_id, geo_fence_id, asset_id,
        shipment_id, load_id, lane_id, event_type, event_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [row.geoFenceEventId, row.geoFenceId, row.assetId, row.shipmentId,
       row.loadId, row.laneId, row.eventType, row.eventAt]
    );
  }

  async lastEventForAssetFence(assetId: string, geoFenceId: string): Promise<GeoFenceEvent | undefined> {
    const { rows } = await this.pool.query(
      `SELECT * FROM tms.geo_fence_events
       WHERE asset_id = $1 AND geo_fence_id = $2
       ORDER BY event_at DESC LIMIT 1`,
      [assetId, geoFenceId]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : undefined;
  }

  private mapRow(row: Record<string, unknown>): GeoFenceEvent {
    return {
      geoFenceEventId: row.geo_fence_event_id as string,
      geoFenceId: row.geo_fence_id as string,
      assetId: row.asset_id as string,
      shipmentId: row.shipment_id as string | null,
      loadId: row.load_id as string | null,
      laneId: row.lane_id as string | null,
      eventType: row.event_type as GeoFenceEvent['eventType'],
      eventAt: (row.event_at as Date)?.toISOString?.() ?? row.event_at as string,
    };
  }
}
