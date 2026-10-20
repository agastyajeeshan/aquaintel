export type UserRole = "ADMIN" | "FARM_MANAGER" | "OPERATOR" | "VIEWER";

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export type PondStatus = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export interface WaterQualityMetrics {
  do: number;
  ph: number;
  temperature: number;
  ammonia: number;
  salinity: number;
  turbidity: number;
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
  aerator_summary: {
    active_count: number;
    total_count: number;
    status: string;
  };
  feeding_summary: {
    status: string;
    dispensed_today_kg: number;
    daily_quota_kg: number;
    next_feeding_time: string;
  };
  disease_risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  disease_risk_score: number;
}

export interface FarmOverview {
  farm_name: string;
  location: string;
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
  connectivity: {
    internet: "ONLINE" | "OFFLINE";
    lora_gateway: "ONLINE" | "STANDBY_OFFLINE";
    sync_queue_records: number;
    data_sync: "ACTIVE" | "QUEUED";
  };
}

export interface AeratorItem {
  id: number;
  pond_id: number;
  aerator_code: string;
  name: string;
  aerator_type: string;
  power_rating_kw: number;
  status: "RUNNING" | "STANDBY" | "STOPPED" | "EMERGENCY";
  mode: string;
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
  status: string;
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
}

export interface DiseasePredictionItem {
  disease_key: string;
  disease_name: string;
  pathogen: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  contributors: Record<string, number>;
  explanations: string[];
  recommendations: string[];
  disclaimer: string;
}

export interface AlertItem {
  id: number;
  pond_id?: number;
  alert_type: string;
  severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  cause?: string;
  recommended_action?: string;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "IGNORED";
  acknowledged_by?: string;
  resolved_by?: string;
  created_at: string;
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
