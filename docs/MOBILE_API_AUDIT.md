# AquaIntel Android Mobile — Complete API Audit & Endpoint Specification

**Version:** 1.0.0  
**Target Platform:** Android (React Native / Expo 52+ / TypeScript)  
**Backend:** FastAPI 0.115+ (Python 3.10+)  
**Dual Mounting:** Every API router is accessible under both `/api/v1/*` (primary modern contract) and `/api/*` (legacy compatibility).

---

## 1. Executive Summary

An audit of the AquaIntel backend repository (`/Users/jeeshan/Documents/projects/aquaintel`) documents the REST routers (mounted under `/api/v1` and mirrored on `/api`), the WebSocket telemetry broadcaster (`/ws/telemetry`), and the **83 automated backend unit and integration tests** (`backend/tests/`, all passing after mobile stabilization and security/safety hardening).

This audit maps every production endpoint into 13 functional domains, detailing HTTP methods, authentication requirements, user role permissions, request/response schemas, error status codes, and implementation/testing status.

---

## 2. Comprehensive Endpoint Audit Matrix

### Group 1: Authentication & Access Control

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | `UserLogin` (`username`, `password`) | `Token` (`access_token`, `token_type`, `role`, `username`, `full_name`) | 400, 401, 422 | Yes (Tested in `test_phase2_core.py`) |
| `POST` | `/api/v1/auth/register` | Public (Non-Admin) | `UserRegister` (`username`, `email`, `password`, `full_name`, `role`: `OPERATOR` \| `FARM_MANAGER` \| `VIEWER`) | `Token` (`ADMIN` self-registration rejected with `403`) | 400, 403, 422 | Yes (Tested in `test_auth_and_security.py`) |
| `POST` | `/api/v1/auth/logout` | Bearer Token (`get_current_user`) | None | `{"status": "SUCCESS", "message": str}` | 401 | Yes (Tested in `test_phase2_core.py`) |
| `GET` | `/api/v1/auth/me` | Bearer Token (`get_current_user`) | None | `{"id": int, "username": str, "email": str, "role": str, "full_name": str, "phone": str, "farm_id": int?}` | 401 | Yes (Tested in `test_phase2_core.py`) |
| `POST` | `/api/v1/auth/password-reset/request` | Public | `PasswordResetRequest` (`email`: EmailStr) | `{"status": "SENT", "message": str, "debug_token": str}` | 422 | Yes (Tested in `test_phase2_core.py`) |
| `POST` | `/api/v1/auth/password-reset/confirm` | Public | `PasswordResetConfirm` (`token`: str, `new_password`: str) | `{"status": "SUCCESS", "message": str}` | 400, 404, 422 | Yes (Tested in `test_phase2_core.py`) |

---

### Group 2: Farm Dashboard & Overview

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/farms/overview` | Optional / Scoped Token | None | `{"farm_id": int, "farm_name": str, "location": str, "active_ponds": int, "connected_devices": int, "disconnected_devices": int, "running_aerators": int, "total_aerators": int, "pending_maintenance": int, "data_provenance": str, "is_simulated": bool, ...}` | 500 | Yes (Tested in `test_foundation.py`) |
| `GET` | `/api/v1/analytics` | Public / Optional Token | None | `{"farm_summary": dict, "biomass_distribution": list, "energy_analytics": dict, "fcr_trends": list, "water_quality_matrix": list}` | 500 | Yes (Implemented in `analytics.py`) |
| `GET` | `/api/v1/telemetry/latest` | Public / Optional Token | None | `{"fleet_telemetry": list[dict], "timestamp": str}` | 500 | Yes (Implemented in `telemetry.py`) |

---

### Group 3: Farm & Pond Management

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ponds` | Public / Optional Token | Query: `include_archived: bool = False` | `list[PondSummary]` (ID, pond_number, name, area_ha, water_volume_m3, status, water_quality, aerator_summary, feeding_summary, disease_risk) | 500 | Yes (Tested in `test_foundation.py`) |
| `POST` | `/api/v1/ponds` | Public / Role: `ADMIN`, `FARM_MANAGER` | `PondCreate` (`pond_number`, `name`, `area_ha`, `water_volume_m3`, `shrimp_species`, `target_fcr`) | `PondDetail` | 400, 422 | Yes (Tested in `test_phase2_core.py`) |
| `GET` | `/api/v1/ponds/{pond_id}` | Optional / Scoped Token | Path: `pond_id: int`, Query: `time_range: "6h" \| "24h" \| "7d" \| "30d"` | `PondDetail` (`overview` w/ `provenance` & `is_stale`, `live_metrics` w/ `estimated_nh3`, `sensors`, `chart_series`, `feeding_history`, `aeration_events`) | 403, 404, 422 | Yes (Tested in `test_auth_and_security.py`) |
| `PATCH` | `/api/v1/ponds/{pond_id}` | Public / Role: `ADMIN`, `FARM_MANAGER` | `PondUpdate` (Partial fields) | `PondDetail` | 404, 422 | Yes (Tested in `test_phase2_core.py`) |
| `DELETE` | `/api/v1/ponds/{pond_id}` | Public / Role: `ADMIN` | Path: `pond_id: int` | `{"status": "ARCHIVED", "message": str}` | 404, 422 | Yes (Tested in `test_phase2_core.py`) |

---

### Group 4: Sensors & Water Quality Telemetry

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sensors/latest` | Public / Optional Token | None | `{"sensors": list[SensorStatus], "timestamp": str}` | 500 | Yes (Implemented in `sensors.py`) |
| `GET` | `/api/v1/sensors/readings` | Public / Optional Token | Query: `pond_id: int?`, `sensor_type: str?`, `limit: int = 100` | `list[SensorReading]` (`sensor_id`, `pond_id`, `sensor_type`, `value`, `unit`, `recorded_at`, `is_valid`) | 422 | Yes (Implemented in `sensors.py`) |
| `GET` | `/api/v1/sensors/health` | Public / Optional Token | None | `{"total_probes": int, "healthy_count": int, "warning_count": int, "disconnected_count": int, "probes": list}` | 500 | Yes (Implemented in `sensors.py`) |
| `POST` | `/api/v1/telemetry` | Public / Gateway API Key | `TelemetryPacket` (`pond_id`, `gateway_id`, `metrics`, `sensors`, `timestamp`) | `{"status": "INGESTED", "packet_id": str, "records_processed": int}` | 400, 422 | Yes (Tested in `test_phase2_core.py`) |
| `GET` | `/api/v1/telemetry/history` | Public / Optional Token | Query: `pond_id: int`, `hours: int = 24`, `parameter: str?` | `{"pond_id": int, "readings_count": int, "history": list[dict]}` | 404, 422 | Yes (Implemented in `telemetry.py`) |

---

### Group 5: Feeding Management

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/feeding/status` | Public / Optional Token | None | `{"total_daily_quota_kg": float, "total_dispensed_kg": float, "feeders": list[FeederItem], "recent_logs": list}` (includes `pond_do`, `is_stale`, `is_blocked`, `block_reason`) | 500 | Yes (Implemented in `feeding.py`) |
| `POST` | `/api/v1/feeding/calculate` | Public / Optional Token | Query: `pond_id`, `biomass_kg`, `do_level`, `temperature`, `tray_feed_remaining_pct` | `{"recommended_daily_kg": float, "adjusted_ration_kg": float, "reduction_factor": float, "ration_reason": str, "feeding_schedule": list[dict]}` | 400, 422 | Yes (Implemented in `feeding.py`) |
| `POST` | `/api/v1/feeding/{feeder_id}/control` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | `FeederControlRequest` (`action`: "START" \| "STOP" \| "DISPENSE" \| "SCHEDULE", `amount_kg: float?`, `schedule_time: str?`) | `{"feeder_id": int, "action": str, "status": str, "dispensed_kg": float, "timestamp": str}` (`409` on hypoxia/ammonia/stale/quota lockouts) | 400, 403, 404, 409, 422 | Yes (Tested in `test_auth_and_security.py`) |

---

### Group 6: Aeration Control

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/aeration/status` | Public / Optional Token | None | `{"total_power_kw": float, "aerators": list[AeratorItem], "recent_events": list}` | 500 | Yes (Implemented in `aeration.py`) |
| `POST` | `/api/v1/aeration/{aerator_id}/control` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | `AeratorControlRequest` (`action`: "START" \| "STOP" \| "SWITCH_MODE", `mode: str?`, `reason: str?`) | `{"aerator_id": int, "action": str, "command_status": str, "verified_state": str, "pond_do": float}` (`409` on hypoxia/offline lockout) | 400, 403, 404, 409, 422 | Yes (Tested in `test_auth_and_security.py`) |

---

### Group 7: IoT Devices & Controller Communication

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/devices` | Public / Optional Token | None | `list[IoTDeviceItem]` (`id`, `device_id`, `pond_id`, `device_type`, `status`, `battery_pct`, `signal_rssi_dbm`, `firmware_version`, `last_seen_seconds_ago`) | 500 | Yes (Implemented in `devices.py`) |
| `POST` | `/api/v1/devices` | Role: `ADMIN`, `FARM_MANAGER` | Query: `device_id: str`, `device_type: str`, `pond_id: int?` | `IoTDeviceItem` | 400, 422 | Yes (Implemented in `devices.py`) |
| `GET` | `/api/v1/devices/{device_id}` | Public / Optional Token | Path: `device_id: str` | `IoTDeviceItem` (With active alarms and recent telemetry packets) | 404 | Yes (Implemented in `devices.py`) |
| `GET` | `/api/v1/devices/{device_id}/commands` | Public / Optional Token | Path: `device_id: str` | `list[DeviceCommand]` (`command_id`, `action`, `status`, `payload`, `issued_at`) | 404 | Yes (Tested in `test_phase2_core.py`) |
| `POST` | `/api/v1/devices/{device_id}/commands` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | `CommandCreate` (`action`: str, `payload`: dict, `timeout_seconds`: int = 30) | `DeviceCommand` (`command_id`, `status`: "REQUESTED", `issued_at`: str) | 400, 404, 422 | Yes (Tested in `test_phase2_core.py`) |
| `POST` | `/api/v1/devices/{device_id}/ack` | Public / Device Secret | `CommandAck` (`command_id`: str, `status`: "ACKNOWLEDGED" \| "FAILED", `telemetry_verification`: dict) | `{"status": "CONFIRMED", "command_id": str}` | 404, 422 | Yes (Tested in `test_phase2_core.py`) |

---

### Group 8: Predictive Intelligence & Forecasting

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/climate/analysis` | Public / Optional Token | None | `{"fleet_risk_level": str, "critical_ponds": list, "weather_summary": dict, "recommendations": list}` | 500 | Yes (Tested in `test_climate_adaptation.py`) |
| `GET` | `/api/v1/climate/models/performance` | Public / Optional Token | None | `{"models": dict, "baselines": dict, "mae_metrics": dict, "confidence_calibration": dict}` | 500 | Yes (Tested in `test_climate_adaptation.py`) |
| `GET` | `/api/v1/climate/ponds/{pond_id}/forecast` | Public / Optional Token | Path: `pond_id: int` | `MultiHorizonPondForecast` (Predictions for 3h, 6h, 12h, 24h, 72h, 7d with 90% confidence bands for DO, Temp, pH, Salinity, Ammonia) | 404, 422 | Yes (Tested in `test_climate_adaptation.py`) |

---

### Group 9: Climate Adaptation & Weather

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/climate/weather/current` | Public / Optional Token | None | `{"status": str, "weather": WeatherObservation, "location_name": str, "provider": str, "is_simulated": bool}` | 500 | Yes (Tested in `test_climate_adaptation.py`) |
| `GET` | `/api/v1/climate/weather/forecast` | Public / Optional Token | Query: `horizons_hours: int = 72` | `{"hourly_forecast": list[dict], "source": str, "cache_hit": bool}` | 500 | Yes (Tested in `test_climate_adaptation.py`) |
| `GET` | `/api/v1/climate/ponds/{pond_id}/analysis` | Public / Optional Token | Path: `pond_id: int` | `{"pond_id": int, "stratification_risk": str, "hypoxia_probability": float, "salinity_shock_risk": str}` | 404, 422 | Yes (Tested in `test_climate_adaptation.py`) |
| `GET` | `/api/v1/climate/ponds/{pond_id}/recommendations` | Public / Optional Token | Path: `pond_id: int` | `list[ClimateRecommendation]` (`action_type`, `priority`, `reason`, `impact_score`, `approved`: bool) | 404, 422 | Yes (Tested in `test_climate_adaptation.py`) |
| `POST` | `/api/v1/climate/ponds/{pond_id}/approve` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | `RecommendationApproval` (`action_type`: str, `notes: str?`) | `{"status": "APPROVED", "pond_id": int, "action_type": str, "executed_at": str}` | 400, 404, 422 | Yes (Tested in `test_climate_adaptation.py`) |
| `POST` | `/api/v1/climate/simulate` | Role: `ADMIN`, `FARM_MANAGER` | `ScenarioSimulationRequest` (`scenario`: "SUMMER_RAIN" \| "HEAVY_RAIN" \| "HOT_AFTERNOON" \| "COLD_SNAP", `custom_parameters: dict?`) | `{"scenario": str, "simulated_outcomes": dict}` | 400, 422 | Yes (Tested in `test_climate_adaptation.py`) |

---

### Group 10: Disease Intelligence & AI Inference

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/disease/risks` | Public / Optional Token | Query: `pond_id: int?` | `list[DiseaseRiskAssessment]` (WSSV, EHP, EMS_AHPND, Vibriosis scores 0-100, contributor factors, biosecurity recommendations) | 422 | Yes (Implemented in `disease.py`) |
| `POST` | `/api/v1/disease/evaluate` | Public / Optional Token | `DiseaseEvaluationInput` (`water_quality`: dict, `biomass_kg`: float, `mortality_rate`: float) | `DiseaseRiskAssessment` | 400, 422 | Yes (Implemented in `disease.py`) |
| `GET` | `/api/v1/disease/observations` | Optional Token | Query: `pond_id: int?` | `list[HealthObservationItem]` | 422 | Yes (Tested in `test_auth_and_security.py`) |
| `POST` | `/api/v1/disease/observations` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | `HealthObservationCreate` (`pond_id`, `symptom`, `severity`, `mortality_count`, `notes`) | `HealthObservationItem` (Persisted + logged to `AuditLog`) | 403, 404, 422 | Yes (Tested in `test_auth_and_security.py`) |
| `GET` | `/api/v1/ai/models/status` | Public / Optional Token | None | `{"model_id": str, "version": str, "status": str, "synthetic_data_flag": bool, "classes": list, "model_card_url": str}` | 500 | Yes (Tested in `test_ai_dataset_pipeline.py`) |
| `GET` | `/api/v1/ai/data/quality-report` | Public / Optional Token | None | `{"dataset_inventory": list, "quality_score": float, "class_distribution": dict, "provenance": str}` | 500 | Yes (Tested in `test_ai_dataset_pipeline.py`) |
| `POST` | `/api/v1/ai/data/validate` | Role: `ADMIN`, `FARM_MANAGER` | None | `{"status": "VALIDATED", "samples_checked": int, "anomalies_detected": int}` | 500 | Yes (Tested in `test_ai_dataset_pipeline.py`) |
| `POST` | `/api/v1/ai/disease-risk/evaluate` | Public / Optional Token | `AIDiseaseInferenceRequest` (`features`: dict) | `{"predicted_class": str, "probabilities": dict, "risk_level": str, "confidence": float}` | 400, 422 | Yes (Tested in `test_ai_dataset_pipeline.py`) |
| `GET` | `/api/v1/cv/samples` | Public / Optional Token | None | `list[CVSample]` (Sample check-tray inspection cases: "CLEAN_TRAY", "SURPLUS_FEED", "SHRIMP_CROWDED") | 500 | Yes (Implemented in `cv.py`) |
| `POST` | `/api/v1/cv/analyze` | Public / Optional Token | Multipart Form: `file: UploadFile` or Query: `sample_id: str?` | `{"tray_clearing_pct": float, "shrimp_activity_score": float, "recommendation": str, "bounding_boxes": list}` | 400, 422 | Yes (Implemented in `cv.py`) |

---

### Group 11: Alerts & Notifications

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/alerts` | Public / Optional Token | Query: `status: str?`, `severity: str?` | `list[AlertItem]` (`id`, `pond_id`, `alert_type`, `severity`: "INFO" \| "WARNING" \| "HIGH" \| "CRITICAL", `title`, `description`, `cause`, `recommended_action`, `status`: "ACTIVE" \| "ACKNOWLEDGED" \| "RESOLVED", `created_at`) | 422 | Yes (Implemented in `alerts.py`) |
| `POST` | `/api/v1/alerts/{alert_id}/acknowledge` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | Path: `alert_id: int` | `{"alert_id": int, "status": "ACKNOWLEDGED", "acknowledged_at": str}` | 404, 422 | Yes (Implemented in `alerts.py`) |
| `POST` | `/api/v1/alerts/{alert_id}/resolve` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | Path: `alert_id: int` | `{"alert_id": int, "status": "RESOLVED", "resolved_at": str}` | 404, 422 | Yes (Implemented in `alerts.py`) |
| `POST` | `/api/v1/alerts/{alert_id}/ignore` | Role: `ADMIN`, `FARM_MANAGER` | Path: `alert_id: int` | `{"alert_id": int, "status": "IGNORED"}` | 404, 422 | Yes (Implemented in `alerts.py`) |
| `POST` | `/api/v1/alerts/push-token` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR`, `VIEWER` | `PushTokenRegister` (`token`, `platform`, `device_id`) | `{"status": "REGISTERED", "token": str}` | 401, 422 | Yes (Tested in `test_notifications.py`) |

---

### Group 12: Reports & Commercial ROI

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/daily` | Public / Optional Token | Query: `date: str?` (YYYY-MM-DD) | `DailyFarmReport` (`report_date`, `farm_name`, `total_feed_dispensed_kg`, `total_energy_kwh`, `average_fcr`, `mortality_count`, `ponds_summary`: list) | 422 | Yes (Implemented in `reports.py`) |
| `GET` | `/api/v1/reports/export-csv` | Public / Optional Token | Query: `entity_type: str = "water_quality"` | `text/csv` streaming response | 422 | Yes (Implemented in `reports.py`) |
| `GET` | `/api/v1/roi` | Public / Optional Token | None | `{"baseline_annual_profit_inr": float, "optimized_annual_profit_inr": float, "energy_savings_pct": float, "fcr_improvement_pct": float, "disease_loss_reduction_inr": float}` | 500 | Yes (Implemented in `roi.py`) |
| `POST` | `/api/v1/roi/calculate` | Public / Optional Token | `ROICalculationInput` (`feed_cost_per_kg`, `energy_cost_per_kwh`, `shrimp_sale_price_per_kg`, `mortality_rate_reduction`) | `ROICalculationResult` | 400, 422 | Yes (Implemented in `roi.py`) |

---

### Group 13: Farm Settings & Administration

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/settings` | Public / Optional Token | None | `{"farm_name": str, "location": str, "total_hectares": float, "emergency_phone": str, "do_critical_threshold": float, "fcr_target": float, "auto_mode": bool}` | 500 | Yes (Implemented in `settings.py`) |
| `PUT` | `/api/v1/settings` | Role: `ADMIN` | `SettingsUpdate` (Partial fields) | `{"status": "UPDATED", "settings": dict}` | 400, 403, 422 | Yes (Implemented in `settings.py`) |
| `GET` | `/api/v1/settings/users` | Role: `ADMIN`, `FARM_MANAGER` | None | `list[UserProfile]` (`id`, `username`, `email`, `full_name`, `role`, `is_active`) | 403 | Yes (Implemented in `settings.py`) |
| `GET` | `/api/v1/settings/audit-logs` | Role: `ADMIN` | Query: `limit: int = 100` | `list[AuditLogItem]` (`id`, `timestamp`, `user_id`, `username`, `action`, `resource_type`, `resource_id`, `details`) | 403, 422 | Yes (Tested in `test_phase2_core.py`) |
| `POST` | `/api/v1/settings/reset-demo` | Role: `ADMIN` | None | `{"status": "RESET_SUCCESSFUL", "message": "Demo fleet data restored to factory defaults"}` | 403 | Yes (Tested in `test_phase2_core.py`) |

---

### Group 14: Autonomous Management & Safety Engine

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/autonomous/status` | Public / Optional Token | None | `{"mode": "FULLY_AUTONOMOUS" \| "SUPERVISED_ADVISORY" \| "MANUAL_OVERRIDE" \| "EMERGENCY_LOCKDOWN", "active_policies": int, "last_evaluation_time": str, "active_actions_count": int}` | 500 | Yes (Tested in `test_autonomous_engine.py`) |
| `POST` | `/api/v1/autonomous/mode` | Role: `ADMIN`, `FARM_MANAGER` | `ModeUpdateRequest` (`mode`: str, `operator_name: str?`, `reason: str?`) | `{"previous_mode": str, "new_mode": str, "updated_at": str}` | 400, 403, 422 | Yes (Tested in `test_autonomous_engine.py`) |
| `GET` | `/api/v1/autonomous/decisions` | Public / Optional Token | Query: `pond_id: int?`, `limit: int = 50` | `list[AutonomousDecision]` (`decision_id`, `pond_id`, `policy_name`, `rule_triggered`, `action_recommended`, `confidence`, `timestamp`) | 422 | Yes (Tested in `test_autonomous_engine.py`) |
| `GET` | `/api/v1/autonomous/actions` | Public / Optional Token | Query: `pond_id: int?`, `limit: int = 50` | `list[AutonomousAction]` (`action_id`, `pond_id`, `target_device`, `action_type`, `state`: "REQUESTED" \| "EXECUTED" \| "VERIFIED" \| "FAILED", `executed_at`) | 422 | Yes (Tested in `test_autonomous_engine.py`) |
| `POST` | `/api/v1/autonomous/evaluate` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | `PondTarget` (`pond_id: int?`) | `{"status": "EVALUATED", "ponds_analyzed": int, "decisions_count": int}` | 422 | Yes (Tested in `test_autonomous_engine.py`) |
| `POST` | `/api/v1/autonomous/override` | Role: `ADMIN`, `FARM_MANAGER` | `EmergencyOverrideRequest` (`action`: "STOP_ALL" \| "FORCE_AERATION" \| "LOCK_FEEDERS", `pond_id: int?`, `operator_name: str`) | `{"status": "OVERRIDE_ENGAGED", "action": str, "affected_devices": int}` | 400, 403, 422 | Yes (Tested in `test_autonomous_engine.py`) |
| `GET` | `/api/v1/autonomous/safety-config` | Public / Optional Token | None | `{"anti_cycling_cooldown_seconds": int, "min_do_feeding_threshold": float, "emergency_aeration_threshold": float, "max_ammonia_threshold": float}` | 500 | Yes (Tested in `test_autonomous_engine.py`) |
| `PUT` | `/api/v1/autonomous/safety-config` | Role: `ADMIN` | `SafetyConfigUpdate` | `{"status": "UPDATED", "config": dict}` | 400, 403, 422 | Yes (Tested in `test_autonomous_engine.py`) |
| `GET` | `/api/v1/autonomous/notifications` | Public / Optional Token | Query: `limit: int = 50` | `list[AutonomousNotification]` (`notification_id`, `severity`, `title`, `message`, `category`, `dispatched_at`) | 422 | Yes (Tested in `test_autonomous_engine.py`) |
| `POST` | `/api/v1/autonomous/simulate-scenario` | Role: `ADMIN`, `FARM_MANAGER` | `ScenarioInput` (`scenario`: "HYPOXIA_CRISIS" \| "AMMONIA_SPIKE" \| "CYCLONE_DELUGE", `pond_id: int = 4`) | `{"scenario": str, "actions_triggered": list, "recovery_path": str}` | 400, 422 | Yes (Tested in `test_autonomous_engine.py`) |
| `POST` | `/api/v1/autonomous/verify-action/{action_id}` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | Path: `action_id: str` | `{"action_id": str, "verified": bool, "sensor_delta": float, "status": "VERIFIED"}` | 404, 422 | Yes (Tested in `test_autonomous_engine.py`) |

---

### Group 15: Edge-Cloud Hybrid Operations & IoT Gateways

| HTTP Method | Path | Auth / Role | Request Schema | Response Schema | Error Codes | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cloud/status` | Public / Optional Token | None | `{"gateway_count": int, "online_gateways": int, "sync_queue_records": int, "connectivity_state": "CONNECTED" \| "DEGRADED" \| "OFFLINE"}` | 500 | Yes (Tested in `test_edge_cloud_hybrid.py`) |
| `GET` | `/api/v1/cloud/gateways` | Public / Optional Token | None | `list[EdgeGateway]` (`gateway_id`, `location`, `lora_channel`, `status`: "ONLINE" \| "STANDBY_OFFLINE", `last_heartbeat`) | 500 | Yes (Tested in `test_edge_cloud_hybrid.py`) |
| `POST` | `/api/v1/cloud/heartbeat` | Gateway Secret | Query: `gateway_id: str = "GW-NELLORE-DELTA-01"` | `{"status": "HEARTBEAT_ACK", "gateway_id": str, "server_time": str}` | 422 | Yes (Tested in `test_edge_cloud_hybrid.py`) |
| `POST` | `/api/v1/cloud/remote-command` | Role: `ADMIN`, `FARM_MANAGER`, `OPERATOR` | `RemoteCommandPayload` (`command_id`, `pond_id`, `target_device_id`, `subsystem`: "AERATION" \| "FEEDING", `action`: "START" \| "STOP", `operator_id`: str) | `{"status": "QUEUED" \| "EXECUTED", "command_id": str, "safety_check": "PASSED"}` | 400, 403, 422 | Yes (Tested in `test_edge_cloud_hybrid.py`) |
| `GET` | `/api/v1/cloud/remote-commands` | Public / Optional Token | Query: `pond_id: int?`, `limit: int = 50` | `list[RemoteCommandRecord]` (`command_id`, `pond_id`, `action`, `status`, `created_at`, `executed_at`) | 422 | Yes (Tested in `test_edge_cloud_hybrid.py`) |
| `POST` | `/api/v1/cloud/flush-sync` | Gateway Secret | None | `{"status": "FLUSHED", "records_synced": int}` | 500 | Yes (Tested in `test_edge_cloud_hybrid.py`) |
| `GET` | `/api/v1/cloud/sync-batches` | Role: `ADMIN` | Query: `limit: int = 50` | `list[SyncBatch]` (`batch_id`, `gateway_id`, `record_count`, `checksum`, `synced_at`) | 422 | Yes (Tested in `test_edge_cloud_hybrid.py`) |
| `POST` | `/api/v1/cloud/simulate-network` | Role: `ADMIN` | `{"action": "DROP_CONNECTION" \| "RESTORE_CONNECTION", "latency_ms": int}` | `{"status": "SIMULATION_APPLIED", "network_state": str}` | 400, 422 | Yes (Tested in `test_edge_cloud_hybrid.py`) |

---

### Group 16: Telemetry WebSocket & System Diagnostics

| Type | Path | Auth / Role | Payload In / Out | Purpose | Implemented & Tested |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `WS` | `/ws/telemetry` | Public | Emits JSON: `{"event": "telemetry_update", "data": TelemetryPacket, "timestamp": str}` every 3 seconds | High-frequency telemetry stream to all connected clients | Yes (Implemented in `simulator.py` and `main.py`) |
| `GET` | `/health` / `/api/v1/health` | Public | None $\rightarrow$ `{"status": "HEALTHY", "service": "AquaIntel Backend API", "database": {"status": "CONNECTED", "ponds_seeded": 10}, "system": {"demo_mode": bool}}` | Liveness & Readiness probe | Yes (Tested in `test_foundation.py`) |
| `GET` | `/ready` / `/api/v1/ready` | Public | None $\rightarrow$ `{"status": "READY", "database": "CONNECTED"}` | Container readiness probe | Yes (Tested in `test_foundation.py`) |
| `GET` | `/version` / `/api/v1/version` | Public | None $\rightarrow$ `{"project": "AquaIntel", "version": "1.0.0", "api_versions": ["v1", "legacy_api"]}` | API contract versioning | Yes (Tested in `test_phase2_core.py`) |
| `POST` | `/api/v1/simulator/inject` | Admin / Demo | `{"pond_id": int, "event_type": "DISSOLVED_OXYGEN_DROP" \| "AMMONIA_SPIKE" \| "TEMPERATURE_SURGE"}` | Stress testing IoT simulator | Yes (Tested in `test_foundation.py`) |
| `POST` | `/api/v1/simulator/reset` | Admin / Demo | None $\rightarrow$ `{"status": "RESET"}` | Reset simulated conditions | Yes (Tested in `test_foundation.py`) |
| `POST` | `/api/v1/simulator/offline` | Admin / Demo | `{"offline": bool}` | Toggle offline behavior in simulator | Yes (Tested in `test_foundation.py`) |
