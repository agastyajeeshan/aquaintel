/**
 * AQUAINTEL SHARED API CONTRACTS
 * 
 * Reusable, framework-agnostic TypeScript definitions defining the complete
 * client-server contract for AquaIntel Web, Edge Gateways, and Android Mobile Applications.
 * 
 * SENSE → VALIDATE → ANALYZE → PREDICT → DECIDE → ACT → VERIFY
 */

// ==========================================
// 1. GENERIC API RESPONSE & ERROR ENVELOPES
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string; // ISO-8601 UTC (e.g. 2026-11-03T01:30:00Z)
  request_id?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  status: number;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  timestamp: string;
  path: string;
}

// ==========================================
// 2. USER, AUTHENTICATION & ACCESS CONTROL
// ==========================================

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
  created_at?: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
  device_id?: string;
  client_type?: "WEB" | "ANDROID" | "EDGE_GATEWAY";
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in_seconds: number;
  refresh_token?: string;
  user: UserProfile;
}

// ==========================================
// 3. FARM & INFRASTRUCTURE
// ==========================================

export interface FarmConnectivityStatus {
  internet: "ONLINE" | "OFFLINE" | "DEGRADED";
  lora_gateway: "ONLINE" | "STANDBY_OFFLINE";
  sync_queue_records: number;
  data_sync: "ACTIVE" | "QUEUED" | "FAILED";
  last_edge_heartbeat?: string;
}

export interface FarmOverview {
  farm_name: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  total_area_ha: number;
  total_ponds: number;
  healthy_ponds: number;
  warning_ponds: number;
  critical_ponds: number;
  total_biomass_kg: number;
  today_feed_kg: number;
  energy_consumption_kwh: number;
  energy_cost_inr: number;
  active_alerts_count: number;
  devices_online_ratio: string;
  connectivity: FarmConnectivityStatus;
}

// ==========================================
// 4. POND & WATER QUALITY METRICS
// ==========================================

export type PondStatus = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export interface WaterQualityMetrics {
  do: number; // Dissolved Oxygen in mg/L (Target: 5.0 - 7.5 mg/L, Min: 3.8 mg/L)
  ph: number; // Acidity/Alkalinity pH units (Target: 7.5 - 8.3)
  temperature: number; // Water Temperature in Celsius (°C)
  ammonia: number; // Total Ammonia Nitrogen (TAN) in mg/L
  salinity: number; // Salinity in parts per thousand (ppt)
  turbidity: number; // Turbidity (NTU or Secchi disc cm)
  nitrite?: number; // Nitrite (NO2-) in mg/L
  water_depth_m?: number; // Water Depth in meters
  stale?: boolean; // True if sensor readings exceed freshness threshold (>60s)
  last_updated?: string; // ISO-8601 UTC timestamp
}

export interface AeratorSummary {
  active_count: number;
  total_count: number;
  status: "NORMAL" | "DEFICIT" | "EMERGENCY_BOOST" | "ALL_STOPPED";
}

export interface FeedingSummary {
  status: "NORMAL" | "REDUCED" | "LOCKOUT" | "COMPLETED";
  dispensed_today_kg: number;
  daily_quota_kg: number;
  next_feeding_time: string;
}

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
}

// ==========================================
// 5. IOT SENSOR & TELEMETRY PACKETS
// ==========================================

export type SensorType = "DO" | "PH" | "TEMP" | "SALINITY" | "ORP" | "TURBIDITY" | "DEPTH";

export interface SensorStatus {
  sensor_id: string;
  sensor_type: SensorType;
  pond_id: number;
  value: number;
  unit: string;
  is_valid: boolean;
  probe_status: "NORMAL" | "FAULT" | "CALIBRATION_REQUIRED" | "DISCONNECTED";
  last_calibrated_at?: string;
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

export interface TelemetryPacket {
  packet_id: string;
  gateway_id: string;
  pond_id: number;
  timestamp: string; // ISO-8601 UTC
  source: "PHYSICAL_SENSOR" | "EDGE_SIMULATION" | "CLOUD_SYNTHETIC";
  metrics: WaterQualityMetrics;
  sensors: SensorStatus[];
  battery_level_pct?: number;
  rssi_dbm?: number;
}

export interface WebSocketTelemetryMessage {
  event: "telemetry_update" | "alert_triggered" | "command_acknowledged" | "connection_heartbeat";
  data: TelemetryPacket | any;
  timestamp: string;
}

// ==========================================
// 6. EQUIPMENT & ACTUATION
// ==========================================

export type AeratorOperationalState = "RUNNING" | "STANDBY" | "STOPPED" | "EMERGENCY";

export interface AeratorItem {
  id: number;
  pond_id: number;
  aerator_code: string;
  name: string;
  aerator_type: "SURFACE_PADDLEWHEEL" | "DIFFUSED_AIR" | "JET_AERATOR" | "ASPIRATOR";
  power_rating_kw: number;
  status: AeratorOperationalState;
  mode: "AUTO" | "MANUAL" | "EMERGENCY_LOCK";
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
  status: "ONLINE" | "FEEDING" | "STANDBY" | "EMPTY" | "LOCKOUT";
  hopper_capacity_kg: number;
  current_feed_level_kg: number;
  feed_type: string;
  feeding_mode: "SCHEDULED" | "DEMAND_CV" | "MANUAL";
  daily_quota_kg: number;
  dispensed_today_kg: number;
  recommended_today_kg: number;
  reduction_reason?: string;
  reduction_percentage: number;
  next_feeding_time: string;
}

// ==========================================
// 7. COMMAND LIFECYCLE & SAFETY CONTRACTS
// ==========================================

export type CommandLifecycleStage =
  | "REQUESTED"      // Client validated interlocks and prepared payload
  | "COMMAND_SENT"   // Dispatched over HTTPS/WSS to edge gateway
  | "ACKNOWLEDGED"   // Industrial controller (RTU/ESP32) accepted command
  | "VERIFIED"       // Physical telemetry confirmed actuation (e.g. current draw or DO change)
  | "FAILED"         // Command rejected by safety interlock or hardware fault
  | "TIMEOUT";       // No acknowledgment within timeout threshold

export interface EquipmentCommandRequest {
  command_id: string;
  target_subsystem: "AERATION" | "FEEDING" | "PUMP" | "MODE_SWITCH";
  target_device_id: number;
  pond_id: number;
  action: "START" | "STOP" | "SET_SPEED" | "DISPENSE" | "OVERRIDE";
  parameters?: Record<string, any>;
  operator_id?: string;
  operator_role?: UserRole;
  client_timestamp: string; // ISO-8601 UTC
}

export interface EquipmentCommandResponse {
  command_id: string;
  status: CommandLifecycleStage;
  target_device_id: number;
  executed_at?: string;
  acknowledged_by?: "EDGE_CONTROLLER" | "CLOUD_SYNTHETIC";
  telemetry_verification?: {
    verified: boolean;
    sensor_reading_before?: number;
    sensor_reading_after?: number;
  };
  safety_hold?: boolean;
  rejection_reason?: string;
}

// ==========================================
// 8. PREDICTIVE INTELLIGENCE & FORECASTING
// ==========================================

export type ForecastHorizon = "3h" | "6h" | "12h" | "24h" | "72h" | "7d";

export interface ParameterForecastPoint {
  timestamp: string;
  predicted_value: number;
  lower_bound: number; // 90% confidence interval lower
  upper_bound: number; // 90% confidence interval upper
  unit: string;
}

export interface MultiHorizonPondForecast {
  pond_id: number;
  forecast_generated_at: string;
  model_id: string;
  model_version: string;
  horizons: Record<ForecastHorizon, {
    water_temperature: ParameterForecastPoint;
    dissolved_oxygen: ParameterForecastPoint;
    ph: ParameterForecastPoint;
    salinity: ParameterForecastPoint;
    ammonia_tan: ParameterForecastPoint;
    nitrite?: ParameterForecastPoint;
    turbidity?: ParameterForecastPoint;
    biomass_gain_g?: number;
    feed_demand_kg?: number;
  }>;
  disclaimer: string;
}

// ==========================================
// 9. DISEASE INTELLIGENCE & BIO-SECURITY
// ==========================================

export interface DiseaseRiskAssessment {
  disease_key: "WSSV" | "EHP" | "EMS_AHPND" | "BLACK_GILL" | "VIBRIOSIS";
  disease_name: string;
  pathogen: string;
  risk_score: number; // 0 - 100 scale
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  contributors: Record<string, number>; // Factor -> percentage contribution
  explanations: string[];
  recommendations: string[];
  is_clinical_diagnosis: false; // Decision-support only!
  disclaimer: string;
}

// ==========================================
// 10. WEATHER OBSERVATIONS
// ==========================================

export interface WeatherObservation {
  timestamp: string;
  temperature_c: number;
  relative_humidity_pct: number;
  rainfall_mm: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  surface_pressure_hpa: number;
  weather_condition: string;
  cloud_cover_pct?: number;
  location_name: string;
}

// ==========================================
// 11. ALERTS & NOTIFICATIONS
// ==========================================

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
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

// ==========================================
// 12. REPORTS & ANALYTICS
// ==========================================

export interface DailyFarmReport {
  report_date: string; // YYYY-MM-DD
  farm_name: string;
  total_ponds: number;
  total_feed_dispensed_kg: number;
  total_energy_kwh: number;
  average_fcr: number;
  mortality_count: number;
  abnormal_events_count: number;
  ponds_summary: Array<{
    pond_id: number;
    pond_number: number;
    do_min: number;
    do_max: number;
    ph_min: number;
    ph_max: number;
    temp_avg: number;
    feed_kg: number;
    status: PondStatus;
  }>;
}
