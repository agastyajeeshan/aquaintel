# AquaIntel Android Mobile — API & WebSocket Integration Guide

This guide documents the integration between the AquaIntel Android Mobile Application (`mobile/`) and the FastAPI backend (`backend/app/`).

---

## 1. Network Configuration & Environment Routing

Android mobile devices run in diverse networking environments. The application dynamically derives appropriate endpoints:

| Environment | HTTP Base URL | WebSocket Telemetry URL | Notes |
|---|---|---|---|
| **Android Emulator** | `http://10.0.2.2:8000/api` | `ws://10.0.2.2:8000/ws/telemetry` | Default Android QEMU alias for host machine |
| **Physical Android Device** | `http://192.168.1.xxx:8000/api` | `ws://192.168.1.xxx:8000/ws/telemetry` | Development workstation LAN IP address |
| **Production Cloud** | `https://api.aquaintel.farm/api` | `wss://api.aquaintel.farm/ws/telemetry` | TLS-encrypted reverse proxy |

> [!WARNING]
> Inside the Android emulator, `localhost` refers to the Android device loopback interface, NOT your development laptop. Always use `10.0.2.2:8000`.

---

## 2. Authentication Contract

Authentication uses OAuth2 Bearer JWT tokens.

### 2.1 Login Request
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "operator",
  "password": "operator123"
}
```

### 2.2 Response (`200 OK`)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "OPERATOR",
  "username": "operator",
  "full_name": "B. Venkat (Shift Field Lead)"
}
```

### 2.3 Bearer Token Injection
All subsequent authenticated requests automatically attach headers via Axios interceptor:
```http
Authorization: Bearer <access_token>
X-Client-Platform: Android
X-Client-Version: 1.0.0
X-Device-Id: dev_xxxxxxx
```

If an HTTP `401 Unauthorized` response is returned, the mobile application automatically purges the token from `Expo SecureStore` and redirects the user to the login screen.

---

## 3. Core API Endpoint Mapping

### 3.1 Fleet & Farm Overview
- **`GET /api/farms/overview`**: Returns total biomass (kg), active pond counts, energy consumption (kWh), daily feed dispensed, and active alert counter.
- **`GET /api/ponds`**: Returns array of 10 commercial ponds with current water quality, aerator summaries, and disease risk scores.
- **`GET /api/ponds/{pond_id}?time_range=24h`**: Returns detailed pond telemetry, time series chart records, aerators, feeders, and active events.

### 3.2 Aeration Control & Hypoxia Safety
- **`GET /api/aeration/status`**: Returns operational status of all 40 aerators, kWh energy consumed, and recent switching events.
- **`POST /api/aeration/{aerator_id}/control`**:
  ```json
  { "action": "START" } // or "STOP", "AUTO", "EMERGENCY_OVERRIDE"
  ```
  *Safety Rule:* If current pond DO $< 3.8\text{ mg/L}$, stop commands are rejected with an emergency hypoxia lockout.

### 3.3 Smart Feeding Management
- **`GET /api/feeding/status`**: Returns feeder hopper capacities, dispensed totals, and daily quotas.
- **`POST /api/feeding/{feeder_id}/control`**:
  ```json
  { "action": "DISPENSE", "amount_kg": 5.0 }
  ```
  *Safety Rule:* If pond DO $< 4.0\text{ mg/L}$, feed dispension is locked out to prevent unconsumed pellet accumulation.

### 3.4 AI Predictive Intelligence & Climate
- **`GET /api/climate/weather/current`**: Returns real-time observation from Nellore coastal station.
- **`GET /api/climate/weather/forecast?horizons_hours=72`**: Returns hourly forecast timeline.
- **`GET /api/climate/ponds/{pond_id}/forecast`**: Returns multi-horizon predictions (3h, 6h, 12h, 24h, 72h, 7d) with 90% confidence uncertainty bounds.
- **`GET /api/climate/ponds/{pond_id}/recommendations`**: Returns explainable aeration power targets and feed adjustments.
- **`POST /api/climate/ponds/{pond_id}/approve`**: Logs operator approval in audit log.

### 3.5 Disease-Risk Intelligence
- **`GET /api/disease/risks`**: Returns multi-pathogen risk ratings (WSSV, EHP, EMS/AHPND, Vibriosis).
- **`POST /api/disease/evaluate`**: Evaluates custom environmental stress markers.
- **`POST /api/cv/analyze`**: Check-tray computer vision image analysis.

### 3.6 Alerts & Push Notifications
- **`GET /api/alerts`**: Returns active and historical alerts.
- **`POST /api/alerts/{alert_id}/acknowledge`**: Acknowledges alert with operator name.
- **`POST /api/alerts/{alert_id}/resolve`**: Resolves alert.
- **`POST /api/alerts/push-token`**: Registers Expo push notification token.

---

## 4. WebSocket Telemetry Protocol

### Connection URL
```
ws://10.0.2.2:8000/ws/telemetry?client_id=<UUID>&token=<JWT_TOKEN>
```

### Outgoing Heartbeat Ping (Every 20 Seconds)
```json
{
  "action": "ping",
  "client_time": "2026-11-08T07:30:00Z"
}
```

### Incoming Telemetry Stream
```json
{
  "event": "telemetry_update",
  "data": {
    "pond_id": 4,
    "timestamp": "2026-11-08T07:30:00Z",
    "metrics": {
      "do": 6.12,
      "ph": 8.05,
      "temperature": 29.4,
      "ammonia": 0.02,
      "salinity": 19.8,
      "turbidity": 35.0,
      "stale": false
    }
  }
}
```
The incoming packet triggers immediate state updates in `useFarmStore.updatePondLiveMetrics`.
