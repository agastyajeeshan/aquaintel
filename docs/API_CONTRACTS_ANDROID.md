# AquaIntel — Shared API & WebSocket Contracts for Android & Edge Integration

This document defines the production API and WebSocket contracts for the **AquaIntel Aquaculture Intelligence Platform**. These contracts are implemented in TypeScript under `frontend/src/types/api-contracts.ts` and serve as the single source of truth for Web, Edge Gateways, and future Android Mobile Applications.

---

## 1. System Architecture & Base Endpoints

AquaIntel operates across three unified tiers:
```
┌─────────────────────────────────────────────────────────────┐
│                    REMOTE CLIENT TIER                       │
│  [ AquaIntel Web Dashboard ]     [ AquaIntel Android App ]  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    AQUAINTEL CLOUD TIER                     │
│   FastAPI Gateway • ML Inference • TimeScale / SQLite DB    │
└──────────────────────────────┬──────────────────────────────┘
                               │ MQTT / TLS / LoRaWAN
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   FARM EDGE GATEWAY TIER                    │
│   Industrial Controller (ESP32/RTU) • Local Safety Guard   │
│   Ponds 1-10 • 40 Aerators • 10 Auto-Feeders • DO Probes    │
└─────────────────────────────────────────────────────────────┘
```

### Environment-Based Base URLs
- **HTTP Base URL**: `http://${HOST}:${PORT}/api` (Local) / `https://api.aquaintel.farm/api` (Production)
- **WebSocket Base URL**: `ws://${HOST}:${PORT}/ws` (Local) / `wss://api.aquaintel.farm/ws` (Production)

Android applications must configure these endpoints via `BuildConfig` variables (`API_BASE_URL`, `WS_BASE_URL`).

---

## 2. Authentication & Security Headers

Every authenticated HTTP request must include the standard HTTP `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
X-Client-Platform: Android
X-Client-Version: 1.0.0
X-Device-Id: <UUID>
```

### Authentication Contract
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "operator1",
  "password": "secret_password",
  "device_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "client_type": "ANDROID"
}
```

#### Successful Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in_seconds": 86400,
    "user": {
      "id": 1,
      "username": "operator1",
      "email": "operator@aquaintel.farm",
      "full_name": "Agastya Farm Operator",
      "role": "OPERATOR",
      "farm_id": 1
    }
  },
  "timestamp": "2026-11-03T01:30:00Z"
}
```

---

## 3. Standard Response & Error Envelopes

### A. Success Envelope (`ApiResponse<T>`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Resource retrieved successfully",
  "timestamp": "2026-11-03T01:30:00Z",
  "request_id": "req_88f92a10"
}
```

### B. Error Envelope (`ApiErrorResponse`)
```json
{
  "success": false,
  "status": 403,
  "error": {
    "code": "EDGE_SAFETY_LOCKOUT",
    "message": "Aerator stop rejected: Pond DO (3.40 mg/L) is below emergency threshold (3.80 mg/L).",
    "details": [
      {
        "code": "CRITICAL_HYPOXIA_PROTECTION",
        "field": "pond_do",
        "details": { "current_do": 3.40, "minimum_allowed_do": 3.80 }
      }
    ]
  },
  "timestamp": "2026-11-03T01:30:01Z",
  "path": "/api/aeration/4/control"
}
```

---

## 4. Telemetry Physical Units & Measurement Standards

All telemetry readings transmitted to mobile and web clients adhere strictly to international aquaculture standards:

| Parameter | Unit Symbol | Normal Range | Critical Threshold | Sensor Type |
|---|---|---|---|---|
| Dissolved Oxygen | `mg/L` (ppm) | 5.0 – 7.5 | `< 3.8 mg/L` (Hypoxia) | Luminescent Optical DO Probe |
| Water pH | `pH` (dimensionless) | 7.5 – 8.3 | `< 7.0` or `> 8.8` | Glass Electrode with Gel Electrolyte |
| Temperature | `°C` | 26.0 – 32.0 | `< 24.0°C` or `> 34.0°C` | PT100 / Digital Thermistor |
| Salinity | `ppt` (g/L) | 12.0 – 25.0 | `< 5.0` or `> 35.0` | 4-Electrode Toroidal Conductivity |
| Total Ammonia Nitrogen | `mg/L` | 0.00 – 0.50 | `> 1.0 mg/L` | Ion-Selective Electrode / Colorimetric |
| Nitrite ($NO_2^-$) | `mg/L` | 0.00 – 0.25 | `> 0.50 mg/L` | Photometric Reaction Cell |
| Turbidity | `cm` (Secchi) / `NTU` | 30 – 45 cm | `< 20 cm` (Dense Bloom) | Optical Dual-Beam Turbidity |
| Water Depth | `m` | 1.0 – 1.4 m | `< 0.8 m` (Seepage Loss) | Submersible Hydrostatic Pressure |

**Freshness Rule**: If `Date.now() - timestamp > 60,000 ms`, the measurement MUST be flagged as `stale: true` in the UI.

---

## 5. WebSocket Telemetry Protocol

### Connection URL
`ws://[HOST]:[PORT]/ws/telemetry?token=[JWT_TOKEN]&client_id=[DEVICE_UUID]`

### Outgoing Client Heartbeat
Every 20 seconds, clients should send a lightweight ping:
```json
{
  "action": "ping",
  "client_time": "2026-11-03T01:30:20Z"
}
```

### Ingoing Telemetry Packet (`telemetry_update`)
```json
{
  "event": "telemetry_update",
  "timestamp": "2026-11-03T01:30:20Z",
  "data": {
    "packet_id": "pkt_77189201",
    "gateway_id": "GW-NELLORE-DELTA-01",
    "pond_id": 4,
    "timestamp": "2026-11-03T01:30:20Z",
    "source": "PHYSICAL_SENSOR",
    "metrics": {
      "do": 5.42,
      "ph": 7.85,
      "temperature": 29.1,
      "ammonia": 0.21,
      "salinity": 18.4,
      "turbidity": 34.0,
      "nitrite": 0.04,
      "water_depth_m": 1.25,
      "stale": false
    },
    "battery_level_pct": 98.4,
    "rssi_dbm": -68
  }
}
```

---

## 6. Equipment Actuation & Safety Lifecycle

To prevent catastrophic equipment failure or shrimp mortality, equipment actuations follow an immutable 4-stage lifecycle:

```
[ 1. REQUESTED ]
      │ (Local boundary checks passed)
      ▼
[ 2. COMMAND_SENT / TRANSMITTED ]
      │ (HTTPS/WSS dispatched to Edge Gateway)
      ▼
[ 3. ACKNOWLEDGED ]
      │ (Industrial Controller accepted command)
      ▼
[ 4. VERIFIED ]
        (Telemetry confirms actuation e.g. current draw)
```

### Core Safety Rules
1. **Edge Emergency Hypoxia Lockout**: Cloud or mobile commands cannot turn off aerators if Pond DO is below 3.8 mg/L.
2. **DO Feeding Lockout**: Feeders cannot dispense feed if Pond DO is below 4.0 mg/L.
3. **Daily Feed Cap**: Feeder will reject commands exceeding the daily biomass calculation ceiling.
4. **Idempotency Key**: Every command request must include a client-generated UUID `command_id` to prevent duplicate execution during network retries.

---

## 7. Android Kotlin Data Class Recommendations

For Android applications using Retrofit / Kotlin Serialization:

```kotlin
package farm.aquaintel.model

import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T,
    val message: String? = null,
    val timestamp: String,
    val requestId: String? = null
)

@Serializable
data class WaterQualityMetrics(
    val `do`: Double,
    val ph: Double,
    val temperature: Double,
    val ammonia: Double,
    val salinity: Double,
    val turbidity: Double,
    val nitrite: Double? = null,
    val waterDepthM: Double? = null,
    val stale: Boolean = false,
    val lastUpdated: String? = null
)

@Serializable
data class PondSummary(
    val id: Int,
    val pondNumber: Int,
    val name: String,
    val areaHa: Double,
    val waterVolumeM3: Double,
    val shrimpSpecies: String,
    val currentAgeDays: Int,
    val estimatedBiomassKg: Double,
    val survivalRatePct: Double,
    val targetFcr: Double,
    val status: String,
    val waterQuality: WaterQualityMetrics
)

@Serializable
data class EquipmentCommandRequest(
    val commandId: String,
    val targetSubsystem: String,
    val targetDeviceId: Int,
    val pondId: Int,
    val action: String,
    val parameters: Map<String, String>? = null,
    val operatorId: String? = null,
    val clientTimestamp: String
)
```

---

## 8. REST Endpoint Catalog

| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `GET` | `/api/farms/overview` | Farm fleet health, power, biomass & weather summary | VIEWER |
| `GET` | `/api/ponds` | List all ponds with real-time metrics | VIEWER |
| `GET` | `/api/ponds/{id}` | Detailed telemetry history for a specific pond | VIEWER |
| `GET` | `/api/aeration/status` | Aeration grid status & individual aerator run states | VIEWER |
| `POST`| `/api/aeration/{id}/control` | Start/stop aerator with safety interlock | OPERATOR |
| `GET` | `/api/feeding/status` | Feeder hoppers, daily quotas & dispension metrics | VIEWER |
| `POST`| `/api/feeding/{id}/control` | Dispatch feed burst or schedule | OPERATOR |
| `GET` | `/api/climate/ponds/{id}/forecast` | Multi-horizon prediction for 10 water parameters | VIEWER |
| `GET` | `/api/disease/risks` | Pathogen bio-security risk assessment | VIEWER |
| `GET` | `/api/alerts` | Active farm warning & emergency alerts | VIEWER |
| `POST`| `/api/alerts/{id}/acknowledge`| Acknowledge alert | OPERATOR |
| `GET` | `/api/cloud/status` | Edge-cloud sync queue and gateway health | FARM_MANAGER |
