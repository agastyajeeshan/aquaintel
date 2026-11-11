# AquaIntel — Post-Mobile Code Audit, Runtime Testing & Stabilization Report

**Audit Branch:** `fix/aquaintel-post-mobile-audit`  
**Base Branch:** `feature/aquaintel-android-mobile` (PR `#1` verified `OPEN` / unmerged into `main`)  
**Starting Commit SHA:** `fbe27095904a41cb4a6832e00403129c32158392`  
**Report Status:** Phase 0 (Repository State & Safety) + Phase 1 (Complete Source Code Audit) Completed — Remediation Phases Pending  
**Date:** November 11, 2026

---

## 1. Phase 0 — Repository State & Safety Verification

| Item | Verified Result | Classification |
|---|---|---|
| **Remote Origin** | `https://github.com/agastyajeeshan/aquaintel.git` (fetch & push) | **VERIFIED** |
| **PR #1 Status** | `OPEN` (`mergedAt: null`), `feature/aquaintel-android-mobile` -> `main` (`https://github.com/agastyajeeshan/aquaintel/pull/1`) | **VERIFIED** |
| **Starting Commit SHA** | `fbe27095904a41cb4a6832e00403129c32158392` | **VERIFIED** |
| **Audit Branch Created** | `fix/aquaintel-post-mobile-audit` branched cleanly from `feature/aquaintel-android-mobile` | **VERIFIED** |
| **Preserved User Changes** | 5 unstaged timestamp modifications under `ai/` (`ai/artifacts/metadata.json`, `ai/artifacts/model_card.md`, `ai/data/disease/reports/data_quality_report.{json,md}`, `ai/data/disease/reports/evaluation_report.json`) left untouched | **VERIFIED** |

---

## 2. Phase 1 — Baseline Verification & Dependency Health

All existing automated checks ran directly on `fix/aquaintel-post-mobile-audit` at starting commit `fbe2709`:

| Check | Command | Observed Result | Classification |
|---|---|---|---|
| **Backend Pytest** | `backend/venv/bin/pytest backend/tests -q` | `83 passed, 81 warnings in 3.77s` | **VERIFIED** |
| **Backend Deps Integrity** | `backend/venv/bin/pip check` | `No broken requirements found.` | **VERIFIED** |
| **Mobile Jest Suite** | `cd mobile && npm test -- --silent` | `7 passed, 7 total` suites (`34 passed, 34 total` tests) | **VERIFIED** |
| **Mobile TypeScript** | `cd mobile && npm run typecheck` | `tsc --noEmit` exited `0` (`0` errors) | **VERIFIED** |
| **Frontend Web Build** | `cd frontend && npm run build` | `tsc -b && vite build` exited `0` (2,500 modules in 455ms) | **VERIFIED** |
| **Frontend Lint** | `cd frontend && npm run lint` | `oxlint` exited `0` (`0` errors, `44` warnings) | **VERIFIED** |
| **Frontend npm Audit** | `cd frontend && npm audit` | `1 moderate` (`postcss-selector-parser <6.1.5`) | **VERIFIED** |
| **Mobile npm Audit** | `cd mobile && npm audit` | `37 vulnerabilities` (`8` low, `20` moderate, `8` high, `1` critical; transitive Expo CLI / `tar`, `@xmldom/xmldom`, `zod <4.6.6`, `postcss`, `deepmerge`) | **VERIFIED** |

---

## 3. Phase 1 — Architecture & Directory Audit Findings

Every major repository directory (`frontend/`, `backend/`, `mobile/`, `ai/`, `iot/`, `docs/`, `reports/`, `infrastructure/`) was inspected directly.

### A. Critical Findings

1. **`F-CRIT-01` — Unauthenticated Admin Fallback Hardcoded On (`backend/app/config.py:15,40`, `backend/app/core/security.py:67-71`, `compose.yaml:38-39`)**
   - **Root Cause:** `Settings.DEMO_MODE` is hardcoded to `True` rather than environment-controlled, and `Settings.SECRET_KEY` defaults to `"aquaintel-super-secret-key-2026-production"` with zero startup validation. `get_current_user` silently authenticates missing Bearer tokens as `"admin"` whenever `DEMO_MODE` is `True`. `compose.yaml` also ships hardcoded PostgreSQL/JWT secrets and does not disable `DEMO_MODE`.
   - **Reproduction:** Start backend using `compose.yaml` defaults and send an unauthenticated request to a `get_current_user`-protected route; `get_current_user` returns the seeded `admin` user.
   - **Recommended Fix:** Drive `DEMO_MODE` and `APP_ENV` from environment variables (`False` in production), enforce non-default `SECRET_KEY` validation on non-demo startup, and reject missing Bearer tokens with `401 Unauthorized` when not explicitly running in demo mode.

2. **`F-CRIT-02` — Unauthenticated Endpoints & Incomplete Multi-Farm Tenant Isolation (`backend/app/api/*.py`)**
   - **Affected Files:** `alerts.py` (`GET /alerts`, `POST /alerts/{id}/ignore`), `devices.py` (`GET /devices`, `GET /devices/{id}`, `POST /devices`, `POST /devices/{id}/ack`, `GET /devices/{id}/commands`), `settings.py` (`POST /settings/reset-demo`, `GET /settings/audit-logs`), `autonomous.py` (`POST /mode`, `/evaluate`, `/override`, `/simulate-scenario`, `/verify-action`, `PUT /safety-config`), `cloud_edge.py` (`POST /heartbeat`, `/flush-sync`, `/simulate-network`, `GET /sync-batches`, `GET /remote-commands`, plus un-scoped `req.pond_id` on `POST /remote-command`), `climate.py` (`POST /ponds/{id}/approve`, `/simulate`), `simulator.py` (`POST /inject`, `/reset`, `/offline`, `WS /ws/telemetry`), `telemetry.py` (`POST /telemetry`), `ponds.py` (`GET /ponds`), `sensors.py`, `feeding.py`, `aeration.py`, `reports.py`.
   - **Reproduction:** Issue unauthenticated `POST /api/v1/settings/reset-demo`, `POST /api/v1/alerts/1/ignore`, `POST /api/v1/autonomous/override`, or `POST /api/v1/telemetry` — each executes without a token or farm-ownership validation. Similarly, non-admin tokens on Farm 2 can read Farm 1 resources across collection endpoints (`GET /sensors/*`, `GET /alerts`, `GET /aeration/status`, `GET /feeding/status`, `GET /devices`, `GET /reports/*`).
   - **Recommended Fix:** Require authenticated users + role checks on operational mutations, device/gateway secrets on hardware ingestion & `/ack`, and strict `farm_id` ownership scoping across all pond/equipment/sensor/alert/report queries and mutations.

3. **`F-CRIT-03` — Safety Evaluation Edge Defects (`backend/app/core/control_service.py:51,117-119`, `backend/app/core/iot_simulator.py:161-163`, `backend/app/core/edge_gateway.py:257-261`)**
   - **Affected Files & Defects:**
     - `control_service.py:51`: `if not do_sensor or not do_sensor.current_value:` treats `0.0 mg/L` dissolved oxygen (falsy float) as `"DO sensor offline or value unavailable"` instead of triggering emergency aeration.
     - `control_service.py:117-119`: `evaluate_pond_feeding` substitutes fake healthy values (`6.0` DO, `29.0`°C, `0.02` ammonia) if `Sensor` rows are absent, and omits sensor staleness, `DO < 4.0`, and `ammonia > 0.10` enforcement.
     - `iot_simulator.py:161-163` vs `sensors.py:47` & `devices.py:27`: `SENSOR_DISCONNECTION` emits `do_val = 0.0` instead of `None`/unavailable, and `sensors.py` / `devices.py` check `"SENSOR_FAILURE"` instead of `"SENSOR_DISCONNECTION"`.
     - `edge_gateway.py:257-261`: sets `cmd_rec.status = "QUEUED"` when edge gateway connectivity is severed rather than rejecting stale/unsafe remote commands on offline reconnection.
   - **Recommended Fix:** Check `is None` explicitly, reject missing/stale sensors in feeding & aeration evaluation, align `SENSOR_DISCONNECTION` event semantics (`None` when probe is offline), implement explicit `REQUESTED -> VALIDATED -> SENT_TO_EDGE -> ACKNOWLEDGED -> VERIFIED` transitions in control paths, and prevent blind replay of queued offline actuator commands.

### B. High Findings

4. **`F-HIGH-01` — Registration Farm Assignment, Token Lifecycle & Reset Token Exposure (`backend/app/api/auth.py:80,110-121,148-167`, `backend/app/core/security.py:27-31`, `backend/app/models/models.py:42`)**
   - **Root Cause:** `/auth/register` hardcodes `farm_id=1` for every registrant; `UserLogin`/`logout` never issues or revokes token IDs (`jti`) or token version (`ACCESS_TOKEN_EXPIRE_MINUTES = 10080` stays valid 7 days after logout); `/auth/password-reset/request` logs the reset JWT verbatim (`auth.py:149-150`) and always includes `"debug_token"` in HTTP responses (`auth.py:166`). Additionally `Pond.pond_number` (`models.py:42`) enforces global uniqueness instead of per-farm uniqueness (`UniqueConstraint("farm_id", "pond_number")`).
   - **Recommended Fix:** Restrict `debug_token` / token logging strictly behind explicit local demo config, add server-side JWT revocation on `POST /auth/logout` and password reset, support farm-scoped registration, and convert `pond_number` to a per-farm unique constraint with FK/status indexes.

5. **`F-HIGH-02` — CORS Wildcard with Credentials & Anonymous MQTT (`backend/app/main.py:60-65`, `infrastructure/mosquitto/mosquitto.conf:2`)**
   - **Root Cause:** FastAPI configures `allow_origins=["*"]` alongside `allow_credentials=True`. Mosquitto enables `allow_anonymous true` over unencrypted port `1883`.
   - **Recommended Fix:** Parameterize allowed CORS origins from environment (`CORS_ORIGINS`), disallow wildcard + credentials, and document/harden Mosquitto authentication & TLS listener configuration for non-dev deployments.

6. **`F-HIGH-03` — Mobile Auth Fallback, Push Config Blocker & 401 Ordering (`mobile/src/store/authStore.ts:41-50,111`, `mobile/src/services/api/client.ts:18,65-70`, `mobile/app.json:56`, `mobile/eas.json`)**
   - **Affected Files & Defects:**
     - `authStore.ts:41-50`: `login()` silently falls back to constructing a partial profile object (`id: 0`, `email: ''`) from login response if `GET /auth/me` fails; `restoreSession()` failure omits `offlineDatabase.clearAllCache()`.
     - `client.ts:65-70`: HTTP `401` handler clears `SecureStore` *before* calling `onUnauthorizedCallback`, preventing authenticated backend push token deregistration when triggered from `logout()`. Also `client.ts:18` labels web/non-Android platforms as `'iOS'`.
     - `mobile/app.json:56`: `"projectId": "aquaintel-commercial-farm-mobile"` is a non-UUID placeholder, and `android.googleServicesFile` (`google-services.json`) is unconfigured — blocking live Expo push token generation (`Notifications.getExpoPushTokenAsync`) and FCM V1 delivery on real Android hardware (**BLOCKED** without external Expo EAS & Firebase credentials).
     - `mobile/eas.json:14,25,35`: uses legacy `/api` paths instead of `/api/v1` and hardcodes `10.0.2.2` in the `preview` APK profile.

### C. Medium Findings

7. **`F-MED-01` — Cross-Farm Push Leak, Simulated Fallbacks & Schema Migration Drift (`backend/app/core/notification_service.py:64`, `backend/app/api/ponds.py:39,94-96`, `backend/app/api/telemetry.py:85`, `backend/app/database.py:18-28`, `frontend/src/pages/Auth.tsx`, `frontend/src/context/AppContext.tsx`)**
   - `notification_service.py:64` includes `(User.farm_id.is_(None))` when resolving pond notification recipients, potentially leaking alerts to non-admin accounts without `farm_id`.
   - `ponds.py:39,94-96` returns fabricated fallback numbers (`total_aerators or 4`, `dispensed_today_kg: 30.0`, `daily_quota_kg: 45.0`) when equipment rows are missing.
   - `telemetry.py:85` hardcodes `sensor_id=1` instead of matching the target pond's actual `Sensor` record.
   - `database.py:18-28` uses SQLite-only `PRAGMA table_info(users)` inside a swallowed `except Exception: pass`; Alembic migration `930fec5b847c` has not been updated for `users.farm_id`, `DevicePushToken`, or `DeviceCommand`.
   - `frontend/src/pages/Auth.tsx` & `AppContext.tsx` maintain a client-only demo `ADMIN` session (`admin123` / `Dr. K. Srinivas`) without calling `/api/v1/auth/login`.

8. **`F-MED-02` — AI Missing-Data Defaults & Firmware Hardware Stub (`ai/features/feature_extractor.py:15-26`, `backend/app/api/ai.py:148,151-163`, `iot/firmware/esp32_pond_master.ino:37-41`)**
   - `TelemetryFeatureExtractor.extract_features([])` returns healthy baseline numbers (`mean_do: 6.0`, etc.) instead of `insufficient_data` / `None`.
   - `backend/app/api/ai.py:151-163` fills missing fields with synthetic healthy defaults (`temp=28.5`, `do=5.5`, `ph=7.9`, `ammonia=0.05`) even when offline or omitted, and approximates `nh3_val = ammonia_val * 0.1` instead of `PondPredictiveEngine.calculate_unionized_nh3`. Model card (`ai/artifacts/metadata.json`) accurately marks the trained Random Forest as `is_synthetic: true` / `NOT_VALIDATED_FOR_REAL_WORLD_DISEASE_PREDICTION` (`accuracy: 0.55`, `macro_f1: 0.2314`).
   - `iot/firmware/esp32_pond_master.ino:37-41`: `readOpticalDO()` returns constant `5.8` (Modbus RS485 register read is unimplemented).

9. **`F-MED-03` — Dependency & Lockfile Advisories (`frontend/package.json`, `mobile/package.json`, `backend/requirements.txt`)**
   - `frontend`: `1 moderate` (`postcss-selector-parser <6.1.5`).
   - `mobile`: `37` npm audit advisories (`1 critical`, `8 high`, `20 moderate`, `8 low` — Expo SDK 52 CLI dependencies + `zod <4.6.6`).
   - `backend/requirements.txt`: unpinned `>=` specifications; `python-jose 3.5.0` pulls `ecdsa 0.19.2`.

10. **`F-LOW-01` — Legacy Documentation Skew (`docs/API_CONTRACTS_ANDROID.md`, `docs/api.md`)**
    - Older Nov 2 / Oct 31 docs (`API_CONTRACTS_ANDROID.md`, `api.md`) do not reflect the hardened `/api/v1/*` mobile contracts documented in `MOBILE_API_INTEGRATION.md`.

---

## 4. Planned Execution Roadmap

- **Phase 2:** Runtime verification of FastAPI, Web frontend, and Expo app (recording exact health, OpenAPI, WebSocket, and connectivity checks; documenting emulator/physical device availability).
- **Phase 3:** Backend security & multi-farm RBAC hardening (`fix(security): harden authentication and farm authorization`).
- **Phase 4:** Equipment control command lifecycle (`REQUESTED -> VALIDATED -> SENT_TO_EDGE -> ACKNOWLEDGED -> VERIFIED`) and safety interlock fixes (`fix(iot): verify edge equipment command lifecycle`).
- **Phase 5:** Mobile integration & API contract alignment fixes (`fix(mobile): ...`, `fix(api): ...`).
- **Phase 6:** AI provenance & empty/offline input validation (`fix(ai): validate prediction provenance and data quality`).
- **Phase 7:** Push notification configuration audit, logout ordering, & blocker reporting (`fix(notifications): verify Android push registration and delivery`).
- **Phase 8–10:** Comprehensive integration/security tests, Expo export/build verification, and finalized audit report.
