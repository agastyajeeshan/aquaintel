/**
 * AQUAINTEL MOBILE API CONTRACTS & DOMAIN TYPES
 * 
 * SENSE → VALIDATE → ANALYZE → PREDICT → DECIDE → ACT → VERIFY
 */

export type UserRole = "ADMIN" | "FARM_MANAGER" | "OPERATOR" | "VIEWER" | "RESEARCHER";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  farm_id?: number;
  is_active?: boolean;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
  full_name: string;
}

export type DataProvenance = "LIVE" | "DEMO" | "SIMULATED" | "CACHED" | "OFFLINE" | "STALE" | "UNAVAILABLE";

export interface WaterQualityMetrics {
  do: number; // Dissolved Oxygen in mg/L (Target: 5.0 - 7.5)
  ph: number; // pH (Target: 7.5 - 8.3)
  temperature: number; // Water Temp in °C
  ammonia: number; // TAN in mg/L
  salinity: number; // Salinity in ppt
  turbidity: number; // Turbidity (cm Secchi or NTU)
  nitrite?: number; // Nitrite in mg/L
  water_depth_m?: number; // Depth in m
  stale?: boolean;
  last_updated?: string;
  provenance?: DataProvenance;
}

export interface AeratorSummary {
  active_count: number;
  total_count: number;
  status: "NORMAL" | "DEFICIT" | "EMERGENCY_BOOST" | "ALL_STOPPED" | "RUNNING" | "STANDBY";
}

export interface FeedingSummary {
  status: "NORMAL" | "REDUCED" | "LOCKOUT" | "COMPLETED" | "STANDBY" | "FEEDING";
  dispensed_today_kg: number;
  daily_quota_kg: number;
  next_feeding_time: string;
}

export type PondStatus = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export interface PondSummary {
  id: number;
  pond_number: number;
  name: string;
  area_ha: number;
  water_volume_m3: number;
  shrimp_species: string;
  current_age_days: number;
  stocking_date?: string;
  estimated_biomass_kg: number;
  survival_rate_pct: number;
  target_fcr: number;
  status: PondStatus;
  active_event?: string;
  water_quality: WaterQualityMetrics;
  aerator_summary: AeratorSummary;
  feeding_summary: FeedingSummary;
  disease_risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  disease_risk_score: number;
  provenance?: DataProvenance;
}

export interface FarmOverview {
  farm_id?: number;
  farm_name: string;
  location: string;
  total_area_ha: number;
  total_ponds: number;
  active_ponds?: number;
  healthy_ponds: number;
  warning_ponds: number;
  critical_ponds: number;
  total_biomass_kg: number;
  today_feed_kg: number;
  energy_consumption_kwh: number;
  energy_cost_inr: number;
  active_alerts_count: number;
  connected_devices?: number;
  disconnected_devices?: number;
  running_aerators?: number;
  total_aerators?: number;
  pending_maintenance?: number;
  devices_online_ratio: string;
  data_provenance?: DataProvenance;
  is_simulated?: boolean;
  timestamp?: string;
  connectivity: {
    internet: "ONLINE" | "OFFLINE" | "DEGRADED";
    lora_gateway: "ONLINE" | "STANDBY_OFFLINE";
    sync_queue_records: number;
    data_sync: "ACTIVE" | "QUEUED" | "FAILED";
  };
  provenance?: DataProvenance;
}

export interface AeratorItem {
  id: number;
  pond_id: number;
  aerator_code: string;
  name: string;
  aerator_type: string;
  power_rating_kw: number;
  status: "RUNNING" | "STANDBY" | "STOPPED" | "EMERGENCY";
  mode: "AUTO" | "MANUAL" | "EMERGENCY" | "SMART_HYSTERESIS";
  pond_do: number;
  runtime_hours_today: number;
  total_kwh_today: number;
  reason?: string;
  can_switch?: boolean;
}

export interface FeederItem {
  id: number;
  pond_id: number;
  feeder_code: string;
  name: string;
  status: "ONLINE" | "FEEDING" | "STANDBY" | "EMPTY" | "LOCKOUT" | "STOPPED";
  hopper_capacity_kg: number;
  current_feed_level_kg: number;
  feed_type: string;
  feeding_mode: string;
  daily_quota_kg: number;
  dispensed_today_kg: number;
  recommended_today_kg: number;
  reduction_reason?: string;
  reduction_percentage: number;
  next_feeding_time: string;
  pond_do?: number;
  pond_temp?: number;
  pond_ammonia?: number;
  is_stale?: boolean;
  sensor_health?: string;
  is_blocked?: boolean;
  block_reason?: string | null;
}

export type AlertSeverity = "INFO" | "WARNING" | "HIGH" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "IGNORED";

export interface AlertItem {
  id: number;
  pond_id?: number;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  cause?: string;
  recommended_action?: string;
  status: AlertStatus;
  acknowledged_by?: string;
  resolved_by?: string;
  created_at?: string;
  resolved_at?: string;
}

export interface IoTDeviceItem {
  id: number;
  device_id: string;
  pond_id?: number;
  device_type: string;
  status: "ONLINE" | "WARNING" | "OFFLINE";
  battery_pct: number;
  signal_rssi_dbm: number;
  signal_quality: string;
  firmware_version: string;
  ip_address: string;
  uptime_hours: number;
  last_seen_seconds_ago: number;
}

export interface WeatherObservation {
  timestamp_utc: string;
  air_temperature_c: number;
  relative_humidity_pct: number;
  rainfall_mm: number;
  rainfall_probability_pct?: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  cloud_cover_pct?: number;
  solar_radiation_wm2?: number;
  atmospheric_pressure_hpa: number;
  weather_code?: number;
  weather_description: string;
  location_name?: string;
  provider_name?: string;
  is_simulated?: boolean;
  data_freshness_seconds?: number;
}

export interface PondSensorItem {
  id: number;
  device_id: string;
  sensor_type: string;
  model: string;
  unit: string;
  current_value: number;
  min_safe: number;
  max_safe: number;
  optimal_min: number;
  optimal_max: number;
  status: string;
  last_reading_at: string | null;
  is_stale?: boolean;
  provenance?: DataProvenance;
}

export interface DeviceCommandItem {
  command_id: string;
  device_id: string;
  action: string;
  status: CommandLifecycleStage | "COMPLETED" | "EXPIRED";
  reason?: string;
  mode?: string;
  issued_at: string | null;
  expires_at: string | null;
  acknowledged_at?: string | null;
  error_message?: string | null;
}

export interface HealthObservationItem {
  id: number;
  action: string;
  pond_id: number;
  pond_name?: string;
  observation_type: "FARMER_OBSERVED" | "SPECIALIST_ESCALATION" | "LAB_CONFIRMED";
  symptoms: string[];
  mortality_observed: number;
  feeding_response: string;
  notes?: string;
  recorded_by?: string;
  timestamp: string | null;
}

export interface AIModelStatus {
  model_id: string;
  model_name?: string;
  version: string;
  model_status?: string;
  status?: string;
  validation_status?: string;
  is_synthetic_model?: boolean;
  pipeline_artifact_present?: boolean;
  clinical_disclaimer?: string;
}

export interface ForecastPoint {
  timestamp: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  unit: string;
}

export interface MultiHorizonForecast {
  pond_id: number;
  forecast_generated_at: string;
  model_id: string;
  model_version: string;
  horizons: Record<string, {
    water_temperature: ForecastPoint;
    dissolved_oxygen: ForecastPoint;
    ph: ForecastPoint;
    salinity: ForecastPoint;
    ammonia_tan: ForecastPoint;
    nitrite?: ForecastPoint;
    turbidity?: ForecastPoint;
    biomass_gain_g?: number;
    feed_demand_kg?: number;
  }>;
  disclaimer: string;
}

export interface DiseaseRiskAssessment {
  disease_key: string;
  disease_name: string;
  pathogen: string;
  risk_score: number; // 0 - 100
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  contributors: Record<string, number>;
  explanations?: string[];
  recommendations: string[];
  is_clinical_diagnosis: false;
  disclaimer: string;
}

export interface DailyReportSummary {
  report_id: string;
  title: string;
  farm_name: string;
  generated_at: string;
  executive_summary: {
    total_ponds: number;
    healthy_count: number;
    warning_count: number;
    critical_count: number;
    total_biomass_kg: number;
    feed_dispensed_today_kg: number;
    energy_consumed_kwh: number;
    estimated_daily_energy_cost_inr: number;
    unresolved_alerts_count: number;
  };
  pond_status_table: Array<{
    pond_number: number;
    doc: number;
    biomass_kg: number;
    survival_pct: number;
    status: PondStatus;
  }>;
  active_alerts: Array<{
    severity: string;
    title: string;
    recommended_action: string;
  }>;
}

export type CommandLifecycleStage =
  | "PENDING"
  | "REQUESTED"
  | "ACKNOWLEDGED"
  | "EXECUTED"
  | "VERIFIED"
  | "FAILED"
  | "TIMED_OUT"
  | "UNKNOWN";

export interface EquipmentCommandResult {
  command_id: string;
  status: CommandLifecycleStage;
  target_device_id?: number | string;
  message?: string;
  executed_at?: string;
  rejection_reason?: string;
}
