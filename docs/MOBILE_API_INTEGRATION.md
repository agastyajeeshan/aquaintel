# AquaIntel Android Mobile — API & WebSocket Integration Guide

This guide documents the integration between the AquaIntel Android Mobile Application (`mobile/`) and the FastAPI backend (`backend/app/`).

---

## 1. Network Configuration & Environment Routing

Android mobile devices run in diverse networking environments. Both `/api/v1/*` (primary contract) and `/api/*` (legacy compatibility) are mounted by FastAPI; mobile defaults to `/api/v1`:

| Environment | HTTP Base URL | WebSocket Telemetry URL | Notes |
|---|---|---|---|
| **Android Emulator** | `http://10.0.2.2:8000/api/v1` | `ws://10.0.2.2:8000/ws/telemetry` | Default Android QEMU alias for host machine |
| **Physical Android Device** | `http://<LAN_IP>:8000/api/v1` | `ws://<LAN_IP>:8000/ws/telemetry` | Development workstation LAN IP address |
| **Production Cloud** | `https://<YOUR_API_HOST>/api/v1` | `wss://<YOUR_API_HOST>/ws/telemetry` | TLS-encrypted reverse proxy |

> [!WARNING]
> Inside the Android emulator, `localhost` refers to the Android device loopback interface, NOT your development laptop. Use `10.0.2.2:8000` for emulator testing.

---

## 2. Authentication Contract

Authentication uses OAuth2 Bearer JWT tokens.

### 2.1 Login & Registration Requests
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "<username>",
  "password": "<password>"
}
```
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "<username>",
  "email": "<email>",
  "password": "<password>",
  "full_name": "<optional_name>",
  "role": "OPERATOR"
}
```
*RBAC Rule:* Public self-registration is restricted to `OPERATOR`, `FARM_MANAGER`, and `VIEWER`. Attempting to register with `role: "ADMIN"` is rejected by the backend with `403 Forbidden`.

### 2.2 Login Response (`200 OK`)
```json
{
  "access_token": "<jwt_access_token>",
  "token_type": "bearer",
  "role": "OPERATOR",
  "username": "<username>",
  "full_name": "<full_name>"
}
```

### 2.3 Bearer Token Injection
All subsequent authenticated requests automatically attach headers via Axios interceptor (`mobile/src/services/api/client.ts`):
```http
Authorization: Bearer <access_token>
X-Client-Platform: Android
X-Client-Version: 1.0.0
X-Device-Id: <device_uuid>
```

If an HTTP `401 Unauthorized` response is returned, the mobile application automatically purges the token from `Expo SecureStore`, clears cached SQLite telemetry tables (`offlineDatabase.clearAllCache()`), and redirects the user to `/(auth)/login`.

---

## 3. Core API Endpoint Mapping

### 3.1 Fleet & Farm Overview
- **`GET /api/v1/farms/overview`**: Returns `farm_id`, farm name, `location`, total ponds, `active_ponds`, biomass (kg), feed dispensed, energy consumption, connected/disconnected device counts, `running_aerators`, `total_aerators`, `pending_maintenance`, `data_provenance`, and `is_simulated`.
- **`GET /api/v1/ponds`**: Returns array of ponds with current water quality snapshots, aerator/feeder summaries, and disease risk scores.
- **`GET /api/v1/ponds/{pond_id}?time_range=6h|24h|7d|30d`**: Returns detailed pond overview (`provenance`, `is_stale`, `last_updated`), `live_metrics` (including backend-calculated Emerson-Trussell `estimated_nh3`), `sensors`, `chart_series`, `feeding_history`, and `aeration_events`.

### 3.2 Aeration Control & Hypoxia Safety
- **`GET /api/v1/aeration/status`**: Returns operational status of aerators, kWh energy consumed, and recent switching events.
- **`POST /api/v1/aeration/{aerator_id}/control`**:
  ```json
  { "action": "START", "reason": "Manual start" }
  ```
  *Safety Rule:* Both mobile `safetyGuard` and backend `/aeration/{id}/control` reject `STOP` commands with HTTP `409 Conflict` when pond DO $< 3.8\text{ mg/L}$ or sensor data is offline/stale, logging `AERATOR_COMMAND_REJECTED` to `AuditLog`. Returns `command_status`, `verified_state`, and `pond_do`.

### 3.3 Smart Feeding Management
- **`GET /api/v1/feeding/status`**: Returns feeders (`pond_do`, `pond_temp`, `pond_ammonia`, `is_stale`, `sensor_health`, `is_blocked`, `block_reason`, quotas) and recent feeding logs.
- **`POST /api/v1/feeding/{feeder_id}/control`**:
  ```json
  { "action": "DISPENSE", "amount_kg": 5.0 }
  ```
  *Safety Rule:* Supports `START`, `STOP`, `DISPENSE`, and `SCHEDULE`. Backend enforces HTTP `409 Conflict` lockouts when sensor probes are offline/stale, pond DO $< 4.0\text{ mg/L}$, ammonia $> 0.10\text{ mg/L}$, or daily quota is exceeded.

### 3.4 AI Predictive Intelligence & Climate
- **`GET /api/v1/climate/weather/current`**: Returns meteorological observation (`air_temperature_c`, `atmospheric_pressure_hpa`, `weather_description`, `timestamp_utc`, `location_name` derived from `Farm.location`).
- **`GET /api/v1/climate/weather/forecast?horizons_hours=72`**: Returns hourly weather forecast timeline.
- **`GET /api/v1/climate/analysis`**: Returns dynamic fleet-wide pond climate stress analysis (`fleet_analysis`).
- **`GET /api/v1/climate/ponds/{pond_id}/forecast`**: Returns multi-horizon predictions (`3h`, `6h`, `12h`, `24h`, `72h`, `7d`) with 90% confidence intervals for DO, pH, Temperature, Salinity, and Ammonia.
- **`GET /api/v1/climate/ponds/{pond_id}/recommendations`**: Returns explainable aeration power targets and feed adjustments.
- **`POST /api/v1/climate/ponds/{pond_id}/approve`**: Logs operator approval in audit log.

### 3.5 Disease-Risk & AI Model Transparency
- **`GET /api/v1/disease/risks`**: Returns multi-pathogen risk ratings (WSSV, EHP, EMS/AHPND, Vibriosis).
- **`POST /api/v1/disease/evaluate`**: Evaluates custom environmental stress markers.
- **`GET /api/v1/disease/observations`** & **`POST /api/v1/disease/observations`**: Lists and records farmer symptom / mortality observations (`ADMIN`, `FARM_MANAGER`, `OPERATOR`), logging entries to `AuditLog`.
- **`GET /api/v1/ai/models/status`**: Returns model metadata, synthetic dataset flags, experimental/validation status, and clinical disclaimers.
- **`POST /api/v1/cv/analyze`**: Check-tray computer vision image analysis.

### 3.6 IoT Devices, Alerts, Reports & Push Notifications
- **`GET /api/v1/devices`**, **`GET /api/v1/devices/{device_id}`**, **`GET /api/v1/devices/{device_id}/commands`**, **`POST /api/v1/devices/{device_id}/commands`**: Gateway/node telemetry, command history, and manual diagnostic command dispatch.
- **`GET /api/v1/alerts`**, **`POST /api/v1/alerts/{alert_id}/acknowledge`**, **`POST /api/v1/alerts/{alert_id}/resolve`**, **`POST /api/v1/alerts/push-token`**: Alert lifecycle and Expo push token persistence.
- **`GET /api/v1/reports/daily`** & **`GET /api/v1/reports/export-csv`**: Daily report JSON and authenticated CSV export.

---

## 4. WebSocket Telemetry Protocol

### Connection URL
```text
ws://10.0.2.2:8000/ws/telemetry?client_id=<UUID>&token=<JWT_TOKEN>
```

### Outgoing Heartbeat Ping (Every 20 Seconds)
```json
{
  "action": "ping",
  "client_time": "2026-11-11T07:30:00Z"
}
```

### Incoming Telemetry Stream
`telemetrySocket.ts` normalizes both `parsed.type` and `parsed.event` (`TELEMETRY_UPDATE` / `telemetry_update`) and dispatches fleet snapshots into `useFarmStore.updateFleetFromSnapshot(pondsSnapshot, isBackendOffline)` (preserving `DEMO`, `LIVE`, `STALE`, and `OFFLINE` provenance badges).
