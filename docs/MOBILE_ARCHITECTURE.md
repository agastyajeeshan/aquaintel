# AquaIntel Android Mobile — System Architecture Specification

**Document Version:** 1.1.0  
**Target Platform:** Android (minSdkVersion: 24, targetSdkVersion: 34)  
**Core Technologies:** React Native (`0.76.3`), Expo (`~52.0.11`), TypeScript (`^5.3.3`), Expo Router (`~4.0.9`), TanStack Query (`^5.62.7`), Zustand (`^5.0.2`), Expo SQLite (`~15.0.3`), Expo SecureStore (`~14.0.0`)

---

## 1. Architectural Vision & Operational Context

AquaIntel Android is an industrial-grade mobile operational console tailored for commercial *Penaeus vannamei* aquaculture farm operators, managers, and administrators. All site location, pond metadata, sensor inventory, and AI status labels are loaded dynamically from the backend rather than hardcoded.

In rural aquaculture environments, cellular connectivity varies across pond dikes. The mobile architecture enforces a **Local Safety Supremacy and Read-Only Offline Resilience Strategy**:
1. **Safety limits cannot be bypassed** by mobile client logic; FastAPI enforces matching server-side interlocks (`409 Conflict`).
2. **Last known telemetry and alerts are cached locally** in SQLite for offline visibility with explicit `CACHED` / `OFFLINE` / `STALE` / `DEMO` / `LIVE` provenance badges.
3. **Equipment commands are blocked offline**: Remote aerator, feeder, and device actuation commands are strictly disabled when connectivity drops or sensors are stale/unavailable (never queued for blind deferred replay).

---

## 2. Layered Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│  Expo Router v4 (File-Based Navigation) • React Native + Lucide Icons  │
│  [Auth: Login, Register, Forgot Password]                              │
│  [Tabs: Dashboard, Ponds, Intelligence, Alerts, Profile]               │
│  [Stacks: Pond Detail, Water Quality, Feeding (+History), Aeration,    │
│           Disease, Climate, Devices (+Detail), Reports, Settings]      │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    APPLICATION & STATE LAYER                           │
│  • TanStack React Query v5 + Screen Loaders                            │
│  • Zustand Stores (authStore, farmStore, settingsStore)                │
│  • Safety Guard (DO lockouts, ammonia limits, stale probe checks)      │
│  • React Hook Form + zodResolver (Zod schema form validation)          │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  DATA PERSISTENCE & OFFLINE ENGINE                     │
│  • Expo SQLite (cached_farm_overview, cached_ponds, cached_alerts)     │
│  • Expo SecureStore (Hardware-backed JWT access token & device UUID)   │
│  • NetInfo Listener (Real-time online/offline state switching)         │
│  • Full SQLite + SecureStore purge on logout / 401 expiration          │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                     COMMUNICATION & HARDWARE LAYER                     │
│  • Axios HTTP Client (/api/v1/* with Bearer auth & device headers)     │
│  • Reconnecting WebSocket Client (/ws/telemetry live snapshots)        │
│  • Expo Notifications (Android channels & backend push-token syncing)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Folder Structure

```text
mobile/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── ponds.tsx
│   │   ├── intelligence.tsx
│   │   ├── alerts.tsx
│   │   └── profile.tsx
│   ├── ponds/[pondId].tsx
│   ├── water-quality/[pondId].tsx
│   ├── aeration/index.tsx
│   ├── feeding/
│   │   ├── index.tsx
│   │   └── history.tsx
│   ├── disease/index.tsx
│   ├── climate/index.tsx
│   ├── devices/
│   │   ├── index.tsx
│   │   └── [deviceId].tsx
│   ├── reports/index.tsx
│   └── settings/index.tsx
├── src/
│   ├── components/
│   │   ├── charts/ (ForecastBandChart.tsx, TelemetryLineChart.tsx)
│   │   └── common/ (AlertCard.tsx, AppHeader.tsx, BottomNavigation.tsx, Buttons.tsx,
│   │                ChartCard.tsx, ConfirmationDialog.tsx, DeviceCard.tsx,
│   │                FeedbackStates.tsx, MetricCard.tsx, PondCard.tsx,
│   │                SensorStatusCard.tsx, StatusBadge.tsx)
│   ├── constants/index.ts
│   ├── services/
│   │   ├── api/ (aeration, alerts, auth, client, climate, devices, disease,
│   │   │         farms, feeding, intelligence, ponds, reports, sensors, settings, index)
│   │   ├── notifications/notificationService.ts
│   │   ├── safety/safetyGuard.ts
│   │   ├── storage/ (database.ts, secureStore.ts)
│   │   └── websocket/telemetrySocket.ts
│   ├── store/ (authStore.ts, farmStore.ts, settingsStore.ts)
│   ├── theme/index.ts
│   ├── types/ (api.ts, index.ts)
│   └── utils/zodResolver.ts
├── tests/
│   ├── setup.ts
│   ├── components/components.test.tsx
│   └── unit/ (apiClient.test.ts, auth.test.ts, farmStore.test.ts,
│              notifications.test.ts, safety.test.ts, storeAndLogin.test.tsx)
├── app.json
├── babel.config.js
├── eas.json
├── jest.config.js
├── metro.config.js
├── package.json
└── tsconfig.json
```

---

## 4. Navigation Architecture (Expo Router v4)

- **`/` (`app/index.tsx`)**: Session bootstrap gate checking `SecureStore` and redirecting to `(tabs)` or `(auth)/login`.
- **`(auth)` Stack**: `login`, `register`, `forgot-password`.
- **`(tabs)` Bottom Tabs**: `index` (Dashboard), `ponds` (Fleet), `intelligence` (AI & Weather), `alerts` (Alarms), `profile` (Operator Profile).
- **Detail & Operations Stacks**: `ponds/[pondId]`, `water-quality/[pondId]`, `aeration`, `feeding`, `feeding/history`, `climate`, `disease`, `devices`, `devices/[deviceId]`, `reports`, `settings`.

---

## 5. Security & Authentication Architecture

1. **Hardware-Backed Secure Storage**: JWT tokens are stored using `expo-secure-store` (Android KeyStore).
2. **Axios Token Interceptor**: Injects `Authorization: Bearer <token>`, `X-Client-Platform: Android`, `X-Client-Version`, and `X-Device-Id`.
3. **Session Purge**: Both HTTP `401` interception and manual `logout()` wipe `SecureStore` tokens and clear cached SQLite tables (`offlineDatabase.clearAllCache()`).
4. **Privilege Enforcement**: UI hides/disables controls for `VIEWER`; backend blocks `ADMIN` self-registration (`403 Forbidden`) and enforces roles server-side on settings, user lists, observations, and device commands.

---

## 6. Offline-First Relational Cache Architecture

1. **Local SQLite Cache (`aquaintel_mobile.db` via `expo-sqlite`)**:
   - `cached_farm_overview`: Latest farm overview snapshot and timestamp.
   - `cached_ponds`: Last known pond fleet water quality and status metrics.
   - `cached_alerts`: Last known alert list for offline triage visibility.
2. **Offline Command Safety**:
   - Actuation buttons inspect live connectivity (`isOnline`), sensor health, staleness (`> 60s`), and biological safety thresholds (`safetyGuard.ts`).
   - While offline or stale, remote commands are blocked cleanly with explicit operator guidance rather than queued for unsafe deferred execution.

---

## 7. Safety Validation & Real-Time Streaming

1. **Dual Client + Server Safety Interlocks**:
   - **Aeration Stop Lockout**: Rejected when pond `DO < 3.8 mg/L` or probes are offline/stale (backend returns `409 Conflict` + `AERATOR_COMMAND_REJECTED` audit log).
   - **Feeding Lockout**: Rejected when pond `DO < 4.0 mg/L`, ammonia `> 0.10 mg/L`, daily quota reached, or probes are offline/stale (backend returns `409 Conflict`).
   - **No Fabricated Telemetry Fallbacks**: Missing/unavailable sensor readings render `'—'` (`UNAVAILABLE`) rather than fake default numbers.
2. **WebSocket Telemetry (`telemetrySocket.ts`)**:
   - Connects to `/ws/telemetry`, accepts both `TELEMETRY_UPDATE` / `telemetry_update` (`event` or `type`), updates `useFarmStore.updateFleetFromSnapshot(...)`, and distinguishes `DEMO` vs `LIVE` vs `STALE` vs `OFFLINE`.
3. **Android Notifications (`notificationService.ts`)**:
   - Configures Android channels and registers device tokens with `POST /api/v1/alerts/push-token` (skipping gracefully on emulators without Play Services).

---

## 8. Android Build & Permissions Configuration (`mobile/app.json`)

- **Expo SDK:** 52 • **React Native:** 0.76.3 • **Package ID:** `com.aquaintel.mobile` • **JS Engine:** Hermes
- **Declared Android Permissions:** `INTERNET`, `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `VIBRATE`.
