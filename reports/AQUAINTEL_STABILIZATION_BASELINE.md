# AquaIntel — Production Stabilization Baseline Report

**Repository:** `https://github.com/agastyajeeshan/aquaintel.git`  
**Audit & Stabilization Branch:** `fix/aquaintel-production-stabilization`  
**Base Commit (`origin/main` HEAD):** `b110fa633ff5f1ae12c6918ddfd878cc0745f472` (`Merge pull request #2 from agastyajeeshan/fix/aquaintel-post-mobile-audit`)  
**Previous Merged PRs Verified:** PR `#1` (`feature/aquaintel-android-mobile`, merged `6eb02d8d5792a1a245e4e6d57803d5f2e38d1774`), PR `#2` (`fix/aquaintel-post-mobile-audit`, merged `b110fa633ff5f1ae12c6918ddfd878cc0745f472`)  
**Phase Status:** Phase 0 Baseline Complete — No Source Code Modified Yet  
**Date:** November 11, 2026

---

## 1. Repository State & Uncommitted Working Tree

- **Active Branch:** `fix/aquaintel-production-stabilization` branched directly from `origin/main` (`b110fa633ff5f1ae12c6918ddfd878cc0745f472`).
- **Local `main` Branch:** Preserved untouched at `4fcec7b` (19 commits behind `origin/main`).
- **Uncommitted Changes Preserved (5 files in `ai/`):**
  - `ai/artifacts/metadata.json`
  - `ai/artifacts/model_card.md`
  - `ai/data/disease/reports/data_quality_report.json`
  - `ai/data/disease/reports/data_quality_report.md`
  - `ai/data/disease/reports/evaluation_report.json`
  *(Timestamp-only updates refreshed when running `test_ai_dataset_pipeline.py`.)*
- **Untracked Local Artifacts Ignored by `.gitignore`:** Root `.env`, `aquaintel.db`.

---

## 2. Repository Architecture & Structure

| Directory | Stack / Components | Role |
|---|---|---|
| `backend/` | FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic, `python-jose`, `bcrypt`, SQLite/PostgreSQL | Core REST API (`/api/v1/*` and legacy `/api/*`), `/ws/telemetry` WebSocket broadcaster, safety/feeding/aeration/predictive/edge engines |
| `frontend/` | React 19, TypeScript, Vite 8, Tailwind CSS, Recharts, Lucide React (`37` source files) | Commercial aquaculture operator web dashboard (`Auth`, `Dashboard`, `Ponds`, `PondDetail`, `Aeration`, `Feeding`, `ClimateAdaptation`, `AutonomousEngine`, `EdgeCloudHybrid`, `DiseaseIntelligence`, `IoTDevices`, `Reports`, `Settings`) |
| `mobile/` | React Native (`0.76.3`), Expo SDK `52`, TypeScript, Expo Router `v4`, Zustand, TanStack Query, Expo SQLite, SecureStore, Notifications (`20` route screens, `14` API modules) | Android operational console with offline read-only SQLite caching, double-confirmation safety dialogs, and telemetry WebSocket consumer |
| `ai/` | `scikit-learn`, `pandas`, `numpy`, `joblib` (`ai/preprocessing/`, `features/`, `models/`, `inference/`, `training/`, `artifacts/`) | Synthetic disease-risk classifier artifact (`AQUAINTEL-RF-DISEASE-V1.0-SYNTHETIC`), explainable vulnerability engine, anomaly detector, dataset validator |
| `iot/` | `iot/firmware/esp32_pond_master.ino`, `iot/gateway/lora_gateway.py`, `iot/simulator/edge_controller.py`, `iot/schemas/*.json` | ESP32/SX1276/RS485 firmware template, IN865 LoRa gateway simulator, edge state machine, JSON telemetry/command schemas |
| `edge/` | `edge/edge_gateway_daemon.py` | Standalone gateway daemon prototype with local SQLite spool |
| `infrastructure/` | `compose.yaml`, `infrastructure/mosquitto/mosquitto.conf`, `backend/Dockerfile`, `frontend/Dockerfile` | Multi-container Postgres 16 + Eclipse Mosquitto 2 + FastAPI + Nginx deployment templates |
| `docs/` & `reports/` | Engineering specs, API contracts, mobile guides, PDF/Markdown verification reports | Technical documentation & audit trails |

---

## 3. Startup & Test Commands (Observed)

### Startup Commands
- **Backend API:** `cd backend && venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000` (or `python run.py`) — Swagger at `http://localhost:8000/docs`, WebSocket at `ws://localhost:8000/ws/telemetry`.
- **Frontend Web:** `cd frontend && npm run dev` (dev server at `http://localhost:5173`).
- **Mobile Expo:** `cd mobile && npx expo start` (Metro bundler at port `8081`, web preview via `--web`).
- **Docker Stack (`Makefile`):** `docker compose up -d --build` (blocked locally because `docker` is not installed).

### Test & Build Commands
- **Backend Tests:** `backend/venv/bin/pytest backend/tests`
- **Backend Dependency Check:** `backend/venv/bin/pip check`
- **Mobile Tests & Typecheck:** `cd mobile && npm test && npm run typecheck`
- **Mobile Hermes Export:** `cd mobile && HOME=/tmp EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist-android`
- **Frontend Build & Lint:** `cd frontend && npm run build && npm run lint`

---

## 4. Baseline Test & Dependency Audit Results

Executed directly on `fix/aquaintel-production-stabilization` before any code changes:

| Suite / Audit | Command | Observed Result | Status |
|---|---|---|---|
| **Backend Pytest** | `backend/venv/bin/pytest backend/tests` | `83 passed, 81 warnings in 3.63s` | **PASS** |
| **Backend Package Graph** | `backend/venv/bin/pip check` | `No broken requirements found.` (`55` installed packages inspected) | **PASS** |
| **Mobile Jest Suites** | `cd mobile && npm test -- --silent` | `7 passed, 7 total` suites (`34 passed, 34 total` tests in `0.794s`) | **PASS** |
| **Mobile TypeScript** | `cd mobile && npm run typecheck` | `tsc --noEmit` exited `0` (`0` errors) | **PASS** |
| **Frontend Build** | `cd frontend && npm run build` | `tsc -b && vite build` exited `0` (`2,500` modules built in `445ms`) | **PASS** |
| **Frontend Lint** | `cd frontend && npm run lint` | `oxlint` exited `0` (`0` errors, `44` pre-existing warnings) | **PASS** |
| **Frontend `npm audit`** | `cd frontend && npm audit` | `1 moderate` (`postcss-selector-parser <6.1.5`) | **ADVISORY** |
| **Mobile `npm audit`** | `cd mobile && npm audit` | `37 vulnerabilities` (`8` low, `20` moderate, `8` high, `1` critical; transitive Expo CLI / `tar`, `@xmldom/xmldom`, `zod <4.6.6`, `postcss`, `deepmerge`) | **ADVISORY** |

---

## 5. Confirmed Baseline Defects by Area

### Critical Security & Isolation Defects (Target: Phase 1 & Phase 3)
1. **Hardcoded `DEMO_MODE = True` & Insecure `SECRET_KEY` Fallback (`backend/app/config.py:15,40`, `backend/app/core/security.py:67-71`, `compose.yaml:38-39`):**
   - `DEMO_MODE` is hardcoded to `True` in Python rather than environment-controlled. Missing Bearer tokens on `get_current_user` routes silently authenticate as `"admin"`. `SECRET_KEY` falls back to `"aquaintel-super-secret-key-2026-production"` with zero startup validation; `compose.yaml` and `.env.example` also embed hardcoded secrets without disabling `DEMO_MODE`.
2. **Unauthenticated Endpoints & Cross-Farm Isolation Gaps (`backend/app/api/*.py`):**
   - Completely unauthenticated mutations/sensitive reads exist across `alerts.py` (`ignore_alert`), `devices.py` (`add_device`, `acknowledge_device_command`, `get_devices`, `get_device_commands`), `settings.py` (`reset_demo_data`, `get_audit_logs`), `autonomous.py` (`mode`, `evaluate`, `override`, `safety-config`, `simulate-scenario`, `verify-action`), `cloud_edge.py` (`heartbeat`, `flush-sync`, `simulate-network`, `sync-batches`, `remote-commands`, plus un-scoped `req.pond_id` and client-supplied `req.user_role` in `remote-command`), `climate.py` (`approve`, `simulate`), `simulator.py` (`inject`, `reset`, `offline`, `WS /ws/telemetry`), `telemetry.py` (`POST /telemetry`), and `ponds.py` (`GET /ponds`).
   - `farms.py:50-71` queries ALL farms' feeders, aerators, alerts, maintenance records, and IoT devices even after resolving `current_user.farm_id`. `reports.py`, `analytics.py`, `sensors.py`, `aeration.py`, `feeding.py`, `disease.py`, and `alerts.py` lack farm ownership filtering across collection/detail endpoints.
3. **Hardcoded `farm_id=1` Onboarding & Global Pond Uniqueness (`backend/app/api/auth.py:80`, `backend/app/models/models.py:42`):**
   - `/auth/register` hardcodes `farm_id=1` for all registered users. `Pond.pond_number` enforces global uniqueness instead of composite `(farm_id, pond_number)` uniqueness, preventing multi-farm tenant parity.
4. **JWT Lifetime & Logout Revocation Gap (`backend/app/config.py:17`, `backend/app/core/security.py:27-65`, `backend/app/api/auth.py:110-121`):**
   - Tokens live 7 days (`10080` minutes) with no `jti`/token-version revocation; `POST /auth/logout` only inserts an `AuditLog` entry without invalidating the token.
5. **Password Reset Token Exposure (`backend/app/api/auth.py:148-167`):**
   - Logs raw reset JWT to `logger.info` and unconditionally returns `"debug_token"` in HTTP responses.
6. **CORS Wildcard & Anonymous MQTT (`backend/app/main.py:60-65`, `infrastructure/mosquitto/mosquitto.conf:1-6`):**
   - `allow_origins=["*"]` combined with `allow_credentials=True`. Mosquitto enables `allow_anonymous true` on unencrypted port `1883`.

### Critical IoT & Equipment Safety Defects (Target: Phase 2)
7. **`0.0 mg/L` DO Treated as Missing/Offline (`backend/app/core/control_service.py:51`):**
   - `if not do_sensor or not do_sensor.current_value:` evaluates `0.0` as falsy, withholding emergency aeration during total anoxia.
8. **Fake Healthy Sensor Fallbacks in Feeding Safety (`backend/app/core/control_service.py:117-119`):**
   - Replaces missing DO/temperature/ammonia sensors with `6.0`, `29.0`, `0.02`, omits staleness checks, and skips `DO < 4.0` / `ammonia > 0.10` feeding lockouts.
9. **`SENSOR_DISCONNECTION` Naming & `0.0` Mismatch (`backend/app/core/iot_simulator.py:161-163`, `backend/app/api/sensors.py:47`, `backend/app/api/devices.py:27`):**
   - Simulator sets `do_val = 0.0` on disconnection instead of `None`, while `sensors.py` and `devices.py` check `"SENSOR_FAILURE"` instead of `"SENSOR_DISCONNECTION"`.
10. **Queued Offline Actuations & Immediate Verification Gap (`backend/app/core/edge_gateway.py:257-261`, `backend/app/api/aeration.py:136-160`, `backend/app/api/feeding.py`):**
    - `edge_gateway.process_remote_command` queues commands (`QUEUED`) when edge gateway is offline instead of rejecting stale offline control requests; direct API endpoints report executed/completed states without traversing `REQUESTED -> VALIDATED -> SENT_TO_EDGE -> ACKNOWLEDGED -> VERIFIED` with HAL state verification.
11. **Stubbed Hardware Readout in ESP32 Firmware (`iot/firmware/esp32_pond_master.ino:37-41`):**
    - `readOpticalDO()` returns constant `5.8` (Modbus RS485 frame exchange, CRC validation, timeouts, and probe disconnect faults are unimplemented).

### Mobile, AI, Web & Infrastructure Defects (Target: Phases 3–8)
12. **Mobile Auth Fallback & 401 Cleanup Order (`mobile/src/store/authStore.ts:41-50,111`, `mobile/src/services/api/client.ts:18,65-70`):**
    - `login()` fabricates a fallback profile (`id: 0`, `email: ''`) when `/auth/me` fails; `restoreSession()` failure skips `offlineDatabase.clearAllCache()`; HTTP `401` wipes `SecureStore` before callbacks run and labels `web` as `'iOS'`.
13. **Push Notification Config Blockers (`mobile/app.json:56`, `mobile/eas.json`, `backend/app/core/notification_service.py:64`):**
    - Non-UUID placeholder `"projectId": "aquaintel-commercial-farm-mobile"` and missing `googleServicesFile`; `eas.json` targets legacy `/api` and hardcodes `10.0.2.2` in `preview`; `notification_service.py:64` leaks pond alerts to `(User.farm_id.is_(None))`.
14. **Backend Data Integrity & Hardcoded Figures (`backend/app/api/ponds.py:39,94-96`, `telemetry.py:85`, `reports.py:26`, `analytics.py:18-60`, `database.py:18-28`, `edge/edge_gateway_daemon.py`):**
    - Missing aerator/feeder counts fall back to `4`, `30.0`, `45.0`; `telemetry.py:85` hardcodes `sensor_id=1`; `reports.py` hardcodes farm name; `analytics.py` returns static trend arrays; SQLite-only `PRAGMA` migration silently skips Postgres; Alembic (`930fec5b847c`) omits newer schema changes.
15. **Web Demo Auth Bypass (`frontend/src/pages/Auth.tsx`, `frontend/src/context/AppContext.tsx:62-86`):**
    - Frontend defaults to hardcoded `ADMIN` user (`Dr. K. Srinivas`) and logs in via local React state without calling `/api/v1/auth/login`.
16. **AI Missing-Data Defaults (`ai/features/feature_extractor.py:15-26`, `backend/app/api/ai.py:148,151-163`):**
    - Empty/missing readings fall back to healthy constants (`mean_do: 6.0`, `do=5.5`, `temp=28.5`) and `ammonia * 0.1` instead of `PondPredictiveEngine.calculate_unionized_nh3`. Trained RF model (`ai/artifacts/metadata.json`) is explicitly flagged `is_synthetic: true` / `NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION` (`macro_f1: 0.2314`).
17. **Dependency & Secret Hygiene (`backend/requirements.txt`, `frontend/package.json`, `mobile/package.json`):**
    - Unpinned Python `>=` constraints (`python-jose` pulls `ecdsa 0.19.2`); `npm audit` reports `1 moderate` in frontend and `37` (`1 critical`, `8 high`) in mobile.

---

## 6. Development Environment & Known Blockers

- **Installed Toolchain:** Python `3.15.1` (`backend/venv`), Node.js (`v24.22.1` verified earlier), `npm`, `npx`.
- **External / Host Blockers (Cannot Be Verified Without Provisioning):**
  1. **`adb`, Android `emulator`, `gradle`, `eas` CLI are NOT installed** on this macOS host (`which` -> `not found`), blocking native `.apk`/`.aab` compilation and Android emulator installation/launch locally.
  2. **`docker` and `docker-compose` are NOT installed**, blocking local container stack verification.
  3. **Firebase `google-services.json` (FCM V1) and valid Expo EAS UUID `projectId` are absent**, blocking live physical push token generation and push delivery receipt testing.
  4. **Physical Pond Hardware (RS485 probes, LoRaWAN gateways, 3-phase relays/feeders) is absent**; all IoT testing uses deterministic simulators/mocks.
