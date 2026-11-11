# AquaIntel Android Mobile — Comprehensive Implementation Plan

**Target Application:** AquaIntel Commercial Aquaculture Mobile App (Android)  
**Repository:** `https://github.com/agastyajeeshan/aquaintel.git`  
**Working Branch:** `feature/aquaintel-android-mobile`  
**Architecture:** React Native / Expo SDK 52 / TypeScript / Expo Router v4

---

## 1. Roadmap & Implementation Phases

The Android mobile application implementation is partitioned into 9 structured phases (`PHASE 0` through `PHASE 8`), preserving the existing React web dashboard (`frontend/`) and FastAPI backend compatibility (`backend/`):

```text
PHASE 0: Repository Audit & Architecture Planning        [COMPLETE]
PHASE 1: Scaffolding, Core Infrastructure & Types          [COMPLETE]
PHASE 2: Authentication, RBAC & Zod Form Validation        [COMPLETE]
PHASE 3: Command Center Dashboard, Fleet & Pond Detail     [COMPLETE]
PHASE 4: Telemetry Charts (6h/24h/7d/30d) & WebSocket      [COMPLETE]
PHASE 5: Aeration/Feeding Control & 409 Safety Interlocks  [COMPLETE]
PHASE 6: Climate Forecast, Disease Observations & AI Card  [COMPLETE]
PHASE 7: Read-Only SQLite Cache, Offline Guard & Push      [COMPLETE]
PHASE 8: Jest/Pytest/Vite QA, Hermes Export & Docs         [COMPLETE]
```

---

## 2. Phase-by-Phase Technical Summary

### PHASE 0: Repository Audit & Architecture Planning (Completed)
- Audited FastAPI routers, Pydantic schemas, SQLite/PostgreSQL models, and WebSocket streams.
- Documented API mapping, architecture, and rollout phases (`MOBILE_API_AUDIT.md`, `MOBILE_ARCHITECTURE.md`, `MOBILE_IMPLEMENTATION_PLAN.md`).

### PHASE 1: Scaffolding, Core Infrastructure & Shared Contracts (Completed)
- Initialized Expo SDK 52 TypeScript project in `mobile/` with Expo Router v4, Zustand v5, TanStack Query, Axios, and `mobile/src/types/api.ts`.
- Normalized environment config (`mobile/.env.example`, `mobile/src/constants/index.ts`) on `/api/v1` without hardcoded site coordinates or demo secrets.

### PHASE 2: Authentication, Session Management & RBAC (Completed)
- Implemented `/auth/login`, `/register`, `/logout`, `/me`, `/password-reset/request`, `/password-reset/confirm`.
- Replaced any quick-demo presets in `login.tsx` with clean React Hook Form + Zod (`zodResolver.ts`) inputs; restricted public registration in UI and backend (`403 Forbidden` for `ADMIN` self-signup).
- Enforced logout cleanup of both `SecureStore` and SQLite cache (`offlineDatabase.clearAllCache()`).

### PHASE 3: Farmer Dashboard, Fleet Overview & Pond Details (Completed)
- Built protected 5-tab bar (`index`, `ponds`, `intelligence`, `alerts`, `profile`) plus dynamic `app/ponds/[pondId].tsx` (7 tabs including `Sensors`) and `LastUpdatedLabel`.
- Enriched `GET /api/v1/farms/overview` with connected/disconnected devices, running/total aerators, pending maintenance, provenance, and `is_simulated` flags without fabricated defaults.

### PHASE 4: Telemetry Monitoring, Charts & WebSocket Streaming (Completed)
- Added dedicated `app/water-quality/[pondId].tsx`, shared `ChartCard.tsx`, backend `6h` range support, sensor lists, and backend-computed Emerson-Trussell `estimated_nh3`.
- Fixed `telemetrySocket.ts` to parse both `type` and `event` `TELEMETRY_UPDATE` frames into `useFarmStore.updateFleetFromSnapshot(...)`.

### PHASE 5: Equipment Control, Aeration & Feeding Safety Interlocks (Completed)
- Added `app/aeration/index.tsx`, `app/feeding/index.tsx`, and `app/feeding/history.tsx` (`DISPENSE`/`START`/`STOP`/`SCHEDULE`).
- Enforced server-side `409 Conflict` hypoxia, ammonia, stale-probe, and quota lockouts alongside client `safetyGuard` checks and double confirmation dialogs.

### PHASE 6: Predictive Weather, Disease Observations & AI Transparency (Completed)
- Fixed climate field alignment (`air_temperature_c`, `atmospheric_pressure_hpa`, `weather_description`, `location_name` from `Farm.location`), added horizon filters and dynamic `/climate/analysis` pond impacts.
- Added `/ai/models/status` transparency banner and real `POST/GET /api/v1/disease/observations` field symptom reporting in `app/disease/index.tsx`.

### PHASE 7: Offline SQLite Caching, Device Commands & Push Notifications (Completed)
- Persisted farm overview, ponds, and alerts in SQLite (`database.ts`) for offline visibility while strictly blocking equipment commands offline.
- Added `app/devices/[deviceId].tsx` for command history & diagnostic command dispatch; persisted Expo push tokens via `POST /api/v1/alerts/push-token`.

### PHASE 8: Automated Testing, Non-Regression & Documentation (Completed)
- Verified **7 mobile Jest test suites (34 tests)** and `tsc --noEmit` (0 errors).
- Verified **83 backend pytest tests**, Vite production build + `oxlint` (`0` errors) on `frontend/`, FastAPI `TestClient` end-to-end API contract smoke checks, and local Android Hermes bundle compilation (`npx expo export --platform android`, 2,832 modules, 5.77 MB).
- Documented external service requirements (FCM V1) and physical Android SDK/device QA steps.
