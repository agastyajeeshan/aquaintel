# AquaIntel Android Mobile — Comprehensive Implementation Plan

**Target Application:** AquaIntel Commercial Aquaculture Mobile App (Android)  
**Repository:** `https://github.com/agastyajeeshan/aquaintel.git`  
**Working Branch:** `feature/aquaintel-android-mobile`  
**Architecture:** React Native / Expo SDK 52 / TypeScript / Expo Router v4  

---

## 1. Roadmap & Implementation Phases

The Android mobile application implementation is partitioned into 9 structured phases. Each phase is self-contained with explicit deliverables, verification criteria, and zero regressions on the existing web application or backend services.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 0: Repository Audit & Architecture Planning (COMPLETE)               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Scaffolding, Core Infrastructure & Shared Contracts                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Authentication, Session Management & Role-Based Access             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Farmer Dashboard, Fleet Overview & Pond Details                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Telemetry Monitoring, Charts & WebSocket Streaming                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Equipment Control, Aeration & Feeding Safety Interlocks            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: Predictive Weather, Disease AI & CV Inspection                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 7: Offline SQLite Caching, Outbox Queue & Push Notifications          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 8: End-to-End QA, Android APK Build & Production Readiness            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Technical Breakdown

### PHASE 0: Repository Audit & Architecture Planning (Current Phase)
- **Status:** Completed
- **Objectives:**
  1. Complete audit of backend routes, database models, Pydantic schemas, and WebSocket services.
  2. Map 79 REST endpoints across 13 functional domains.
  3. Validate existing test suites (71 pytest tests pass, frontend Vite builds with 0 errors).
  4. Author foundational documentation: `MOBILE_API_AUDIT.md`, `MOBILE_ARCHITECTURE.md`, `MOBILE_IMPLEMENTATION_PLAN.md`.
- **Exit Criteria:** Documentation approved, feature branch clean and committed.

---

### PHASE 1: Scaffolding, Core Infrastructure & Shared Contracts
- **Scope:**
  1. Initialize modern Expo SDK 52 application in `mobile/` with TypeScript template.
  2. Configure Expo Router v4, Metro configuration, Babel presets, and Tailwind / NativeWind styling.
  3. Synchronize `mobile/src/types/api.ts` with `frontend/src/types/api-contracts.ts`.
  4. Implement base HTTP client (`services/api/client.ts`) with Axios, timeout handling, and environment-driven `API_BASE_URL`.
  5. Establish aquaculture theme tokens (Aquaculture Teal `#0d9488`, Forest Green `#0f5132`, Ocean Blue `#0284c7`, Slate `#f8fafc`).
- **Deliverables:**
  - `mobile/package.json`, `app.json`, `tsconfig.json`
  - `mobile/src/config/env.ts` & `theme.ts`
  - `mobile/src/services/api/client.ts`
  - Smoke test: App boots to clean splash screen with environment readiness indicator.

---

### PHASE 2: Authentication, Session Management & Role-Based Access
- **Scope:**
  1. Secure authentication client calling `/api/v1/auth/login`, `/register`, `/logout`, `/me`.
  2. Implement password reset flow calling `/password-reset/request` and `/confirm`.
  3. Hardware-encrypted token persistence via `expo-secure-store`.
  4. Zustand `authStore` with role tracking (`ADMIN`, `FARM_MANAGER`, `OPERATOR`, `VIEWER`).
  5. Unauthenticated navigation stack:
     - `app/(auth)/login.tsx` (With 1-click quick-demo credential presets for fast testing)
     - `app/(auth)/register.tsx`
     - `app/(auth)/forgot-password.tsx`
  6. Automatic token injection and 401 unauthenticated redirect listener.
- **Deliverables:**
  - Complete `(auth)` group screens and authentication unit tests.

---

### PHASE 3: Farmer Dashboard, Fleet Overview & Pond Details
- **Scope:**
  1. Implement protected 5-tab navigation bar (`app/(tabs)/_layout.tsx`):
     - `index.tsx`: Fleet Dashboard & Key Performance Indicators.
     - `ponds.tsx`: 10-Pond fleet overview with color-coded status badges (`GREEN`, `YELLOW`, `ORANGE`, `RED`).
     - `intelligence.tsx`: Predictive and disease overview.
     - `alerts.tsx`: Active warning and critical alerts.
     - `profile.tsx`: Current user details, role permissions, and settings.
  2. High-performance Pond Grid component displaying real-time DO, pH, Temperature, and Aerator counts.
  3. Detailed Pond View (`app/ponds/[pondId].tsx`):
     - Pond metadata (Hectares, Water volume, Age in days, Biomass, FCR).
     - Live sensor strip with freshness indicators ($<60\text{s}$).
     - Equipment overview (Active aerators, feeder hopper levels).
- **Deliverables:**
  - Fully responsive, touch-optimized fleet dashboard screens.

---

### PHASE 4: Telemetry Monitoring, Charts & WebSocket Streaming
- **Scope:**
  1. Auto-reconnecting WebSocket client (`services/websocket/telemetrySocket.ts`) connecting to `/ws/telemetry`.
  2. Live telemetry packet consumer feeding Zustand `farmStore` without full-screen re-renders.
  3. Interactive time-series telemetry charts (`TelemetryLineChart.tsx`):
     - Support 6-hour, 24-hour, and 7-day windows for DO, pH, Temperature, and Salinity.
     - Threshold bands indicating optimal zones (e.g., $DO \ge 5.0\text{ mg/L}$ in green, $< 3.8\text{ mg/L}$ in red).
  4. Stale-sensor detection UI: Dim or flag sensors whose last reading exceeds 60 seconds.
- **Deliverables:**
  - WebSocket ingestion engine and high-performance charting components.

---

### PHASE 5: Equipment Control, Aeration & Feeding Safety Interlocks
- **Scope:**
  1. Fleet-wide Aeration Console (`app/aeration/index.tsx`):
     - Display all 40 aerators grouped by pond.
     - Start / Stop toggle with confirmation dialog.
     - Emergency Boost button: Instantly starts all available aerators on a pond.
  2. Intelligent Feeding Console (`app/feeding/index.tsx`):
     - Feeder hopper status and remaining feed level (kg).
     - Manual feed dispensation trigger.
     - Recommendation calculator calling `/api/v1/feeding/calculate`.
  3. Safety Supremacy Guard (`services/safety/safetyGuard.ts`):
     - Client-side prevention of aerator shutdown if DO $< 3.8\text{ mg/L}$.
     - Client-side feed lockout if DO $< 4.0\text{ mg/L}$ or Ammonia $> 0.1\text{ mg/L}$.
     - 120-second motor anti-cycling protection.
  4. 5-Stage Command Lifecycle Visualizer (`REQUESTED` $\rightarrow$ `COMMAND_SENT` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `VERIFIED`).
- **Deliverables:**
  - Equipment management screens with hardware safety interlocks.

---

### PHASE 6: Predictive Weather, Disease AI & CV Inspection
- **Scope:**
  1. Microclimate & Weather Screen (`app/climate/index.tsx`):
     - Live local observations via `/api/v1/climate/weather/current`.
     - 72-hour forecast via `/api/v1/climate/weather/forecast`.
     - Multi-horizon forecast chart with 90% confidence uncertainty bands (`ForecastBandChart.tsx`).
     - Operator recommendation review & approval workflow (`/climate/ponds/{id}/approve`).
  2. Disease Risk Intelligence (`app/disease/index.tsx`):
     - Vulnerability index for WSSV, EHP, EMS/AHPND, and Vibriosis.
     - Factor contribution breakdown bar charts.
     - Biosecurity recommendations.
  3. Computer Vision Check-Tray Inspection:
     - Integration with camera/gallery to inspect feed check-trays.
     - Calls `/api/v1/cv/analyze` with image data or sample selection.
     - Displays estimated uneaten feed percentage and shrimp feeding activity score.
- **Deliverables:**
  - Predictive intelligence, AI disease models, and CV inspection screens.

---

### PHASE 7: Offline SQLite Caching, Outbox Queue & Push Notifications
- **Scope:**
  1. Local SQLite database (`services/storage/database.ts`):
     - Store last known good fleet snapshot and 24-hour telemetry history.
     - Enable full offline viewing of ponds, metrics, and equipment.
  2. Idempotent Offline Command Outbox:
     - Queue actuator commands issued while offline in SQLite `command_outbox`.
     - NetInfo connectivity listener automatically flushes queued commands upon reconnection.
  3. Push Notification Engine (`services/notifications/notificationService.ts`):
     - Configure Android Notification Channels (`aquaintel-critical`, `aquaintel-climate`, `aquaintel-daily`).
     - Foreground heads-up notification banner with audible alerts for critical hypoxia alarms.
- **Deliverables:**
  - Robust offline caching and alert notification system.

---

### PHASE 8: End-to-End QA, Android APK Build & Production Readiness
- **Scope:**
  1. Complete unit and integration test suite (Jest + React Native Testing Library).
  2. Static analysis and linting (`eslint`, `tsc --noEmit`).
  3. Production Android build configuration:
     - Release signing keystore setup.
     - ProGuard/R8 dead code stripping and optimization.
     - Generate standalone Android APK / AAB.
  4. Write comprehensive Android user and build documentation (`docs/ANDROID_BUILD_GUIDE.md`).
- **Deliverables:**
  - Fully tested, verified, and buildable production Android release.

---

## 3. Risk Assessment & Mitigation Strategy

| Risk Factor | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Intermittent Pond Connectivity** | High | Offline-first SQLite persistence with idempotent outbox queue; UI clearly indicates cached state vs live stream. |
| **Accidental Motor Damage** | Critical | 120-second anti-cycling hysteresis interlock on client and server; UI prevents rapid toggling. |
| **Catastrophic Stock Hypoxia** | Critical | Hard safety lock prevents turning off aerators when DO is below safe limits ($<3.8\text{ mg/L}$). |
| **High WebSocket Battery Consumption** | Medium | Auto-pause WebSocket connection when mobile app moves to background; resume upon foregrounding. |
| **Large Chart Memory Footprint** | Medium | Use optimized SVG-based polyline rendering with capped data points (100 points per horizon) instead of heavy canvas libraries. |
