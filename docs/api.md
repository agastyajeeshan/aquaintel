# AquaIntel — REST & WebSocket API Specification

The AquaIntel API is accessible under the versioned prefix `/api/v1` with automatic backwards-compatible routing under `/api`.

Interactive Swagger UI: `http://localhost:8000/docs`  
ReDoc Documentation: `http://localhost:8000/redoc`

---

## 1. System & Diagnostics

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health`, `/api/v1/health` | Dual health check verifying DB connectivity and pond counts | No |
| `GET` | `/ready`, `/api/v1/ready` | Readiness probe for Kubernetes / Docker orchestrators | No |
| `GET` | `/version`, `/api/v1/version` | Project version and active API version list | No |
| `WS` | `/ws/telemetry` | Real-time WebSocket streaming pond telemetry updates | No |

---

## 2. Authentication & RBAC (`/api/v1/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate with username and password; returns JWT Bearer token |
| `POST` | `/auth/register` | Register new user account with role assignment (ADMIN, FARM_MANAGER, OPERATOR, VIEWER) |
| `GET` | `/auth/me` | Fetch currently authenticated user profile |
| `POST` | `/auth/logout` | Session termination and audit log recording |
| `POST` | `/auth/password-reset/request` | Issue 15-minute cryptographically signed reset token via development mock email adapter |
| `POST` | `/auth/password-reset/confirm` | Confirm password reset and update Bcrypt hashed credential |

---

## 3. Ponds & Fleet Operations (`/api/v1/ponds`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/ponds` | List all ponds with live water quality matrix (supports `include_archived=true`) |
| `POST` | `/ponds` | Provision new pond with standard optical sensor buoy and actuators |
| `GET` | `/ponds/{pond_id}` | Detailed individual pond diagnostics and Recharts time-series |
| `PATCH` | `/ponds/{pond_id}` | Update pond biomass, stocking count, and biological notes |
| `DELETE` | `/ponds/{pond_id}` | Soft delete / archive pond from active monitoring view |

---

## 4. Telemetry & IoT Devices (`/api/v1/telemetry`, `/api/v1/devices`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/telemetry` | Ingest validated JSON telemetry with physical bounds check and deduplication |
| `GET` | `/telemetry/latest` | Latest cross-pond sensor readings snapshot |
| `GET` | `/telemetry/history` | Historical readings filterable by pond and sensor type |
| `GET` | `/devices` | IoT device registry with battery levels, RSSI dBm, and gateway sync status |
| `POST` | `/devices/{device_id}/commands` | Issue actuator command with expiration timestamp and idempotency key |
| `POST` | `/devices/{device_id}/ack` | Process command acknowledgement from edge device |
| `GET` | `/devices/{device_id}/commands` | Query command execution history and delivery states |

---

## 5. Control, Automation & AI (`/api/v1/aeration`, `/api/v1/feeding`, `/api/v1/disease`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/aeration/status` | Real-time aeration runtime, kWh, and ₹7.50/kWh tariff calculation |
| `POST` | `/aeration/{id}/control` | Actuate aerator (START, STOP, EMERGENCY_OVERRIDE, AUTO) |
| `GET` | `/feeding/status` | Daily feed totals, FCR benchmarking, and hopper levels |
| `POST` | `/feeding/calculate` | Compute biomass-driven ration with DO/ammonia safety gates |
| `GET` | `/disease/risks` | Multi-pathogen environmental disease risk scoring (WSSV, Vibriosis, EMS/AHPND) |
| `POST` | `/disease/evaluate` | Custom scenario evaluator with transparent additive stressor points |
