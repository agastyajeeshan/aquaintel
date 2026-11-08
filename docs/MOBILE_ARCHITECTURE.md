# AquaIntel Android Mobile — System Architecture Specification

**Document Version:** 1.0.0  
**Target Platform:** Android (API 26 to 34+ / Android 8.0 to 14+)  
**Core Technologies:** React Native (0.76+), Expo (SDK 52+), TypeScript (5.3+), Expo Router (v4), TanStack Query (v5), Zustand (v5), Expo SQLite (v15)

---

## 1. Architectural Vision & Operational Context

AquaIntel Android is an industrial-grade mobile operational console tailored for commercial aquaculture farm owners, managers, and field technicians operating on **10-hectare commercial Penaeus vannamei facilities** (such as Nellore, Andhra Pradesh, India).

In rural aquaculture environments, cellular networks fluctuate between high-speed 4G/5G, degraded 2G, and total connectivity dropouts across pond dykes. The mobile architecture enforces a **Local Safety Supremacy and Offline-First Resilience Strategy**:
1. **Critical Safety Rules cannot be bypassed** by remote mobile actions.
2. **Telemetry is cached locally** to guarantee instant responsiveness.
3. **Control commands execute through a strict 5-stage verified lifecycle**:  
   `REQUESTED` $\rightarrow$ `COMMAND_SENT` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `VERIFIED` $\rightarrow$ `COMPLETED` (or `FAILED` / `TIMEOUT`).
4. **Offline operations are queued in local SQLite storage** and synchronized idempotently upon reconnection.

---

## 2. Layered Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│  Expo Router v4 (File-Based Navigation) • React Native Paper / Tailwind │
│  [Auth Screens]   [Tabs: Overview, Ponds, Climate, Diseases, Settings] │
│  [Modals: Pond Detail, Aerator Control, Feeder Dispatch, Emergency]    │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    APPLICATION & STATE LAYER                           │
│  • TanStack React Query v5 (Server State, Background Stale-While-Reval) │
│  • Zustand Stores (AuthStore, FleetStore, OfflineQueueStore, UIStore)  │
│  • Safety Guard & Interlock Service (Anti-cycling, Hypoxia lockouts)   │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  DATA PERSISTENCE & OFFLINE ENGINE                     │
│  • Expo SQLite (Local relational database: ponds, telemetry, outbox)   │
│  • Expo SecureStore (Hardware-backed encrypted JWT token store)         │
│  • NetInfo State Machine (Real-time online/offline network detection)  │
│  • Idempotent Outbox Synchronization Engine                            │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                     COMMUNICATION & HARDWARE LAYER                     │
│  • Axios HTTP Client (Bearer Auth injection, timeout, exponential retry)│
│  • Reconnecting WebSocket Client (/ws/telemetry high-freq streaming)  │
│  • Expo Notifications (FCM / Android Notification Channels)            │
│  • Expo Camera & FileSystem (Check-tray CV & Report Sharing)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Recommended Folder Structure

The application will reside strictly inside the `mobile/` directory:

```text
mobile/
├── app/                                 # Expo Router v4 file-based routing
│   ├── (auth)/                          # Unauthenticated stack
│   │   ├── _layout.tsx
│   │   ├── login.tsx                    # Farmer & Manager login
│   │   ├── register.tsx                 # Account registration
│   │   └── forgot-password.tsx          # Password reset request & confirm
│   ├── (tabs)/                          # Authenticated 5-tab navigation
│   │   ├── _layout.tsx                  # Tab bar with Lucide icons
│   │   ├── index.tsx                    # Fleet Overview & Farm KPIs
│   │   ├── ponds.tsx                    # 10-Pond Fleet Grid & Status
│   │   ├── intelligence.tsx             # Disease Risks, AI & Climate Forecasts
│   │   ├── alerts.tsx                   # Live Alarms & Acknowledgments
│   │   └── profile.tsx                  # Operator Profile, Role & Settings
│   ├── ponds/
│   │   └── [pondId].tsx                 # Deep-dive pond telemetry & controls
│   ├── aeration/
│   │   └── index.tsx                    # Fleet-wide aerator actuation console
│   ├── feeding/
│   │   └── index.tsx                    # Auto-feeder controls & ration logs
│   ├── disease/
│   │   └── index.tsx                    # Biosecurity & CV check-tray inspector
│   ├── climate/
│   │   └── index.tsx                    # Multi-horizon weather & microclimate
│   ├── devices/
│   │   └── index.tsx                    # IoT controllers, LoRa gateways, battery
│   ├── reports/
│   │   └── index.tsx                    # Daily operational audit & CSV exports
│   ├── settings/
│   │   └── index.tsx                    # App preferences & demo fleet reset
│   ├── _layout.tsx                      # Root layout, Theme, React Query Provider
│   └── +not-found.tsx                   # 404 fallback
├── assets/                              # App icons, splash screens, diagrams
├── src/
│   ├── components/
│   │   ├── common/                      # Card, Badge, Header, Button, Modal
│   │   │   ├── AppHeader.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ConfirmationDialog.tsx
│   │   │   └── FeedbackStates.tsx
│   │   ├── charts/                      # Lightweight SVGs & Line charts
│   │   │   ├── TelemetryLineChart.tsx
│   │   │   └── ForecastBandChart.tsx
│   │   ├── farm/                        # PondCard, AeratorTile, FeederTile
│   │   └── modals/                      # Safety confirmation modals
│   ├── config/                          # Environment variables & constants
│   │   ├── env.ts                       # Dynamic IP / API base URL config
│   │   └── theme.ts                     # Clean soft palette (Forest Green/Teal)
│   ├── services/
│   │   ├── api/                         # Domain-specific API services
│   │   │   ├── client.ts                # Axios instance with interceptors
│   │   │   ├── auth.api.ts
│   │   │   ├── farms.api.ts
│   │   │   ├── ponds.api.ts
│   │   │   ├── sensors.api.ts
│   │   │   ├── aeration.api.ts
│   │   │   ├── feeding.api.ts
│   │   │   ├── climate.api.ts
│   │   │   ├── disease.api.ts
│   │   │   ├── devices.api.ts
│   │   │   ├── alerts.api.ts
│   │   │   └── reports.api.ts
│   │   ├── websocket/
│   │   │   └── telemetrySocket.ts       # Resilient auto-reconnecting WS
│   │   ├── storage/
│   │   │   ├── secureStore.ts           # Hardware-encrypted token storage
│   │   │   └── database.ts              # SQLite tables (ponds, telemetry, outbox)
│   │   ├── safety/
│   │   │   └── safetyGuard.ts           # Interlocks (DO thresholds, lockout)
│   │   └── notifications/
│   │       └── notificationService.ts   # Expo Notifications & Channels
│   ├── store/                           # Zustand client stores
│   │   ├── authStore.ts                 # User session, JWT, role
│   │   ├── farmStore.ts                 # Current farm, ponds, filter state
│   │   └── syncStore.ts                 # Outbox queue & sync status
│   └── types/                           # Shared TypeScript definitions
│       ├── api.ts                       # Synchronized with api-contracts.ts
│       └── navigation.ts
├── tests/                               # Jest & React Native Testing Library
│   ├── setup.ts
│   ├── unit/
│   │   ├── apiClient.test.ts
│   │   ├── auth.test.ts
│   │   └── safety.test.ts
│   └── components/
├── app.json                             # Expo application configuration
├── babel.config.js
├── metro.config.js
├── package.json
└── tsconfig.json
```

---

## 4. Navigation Architecture (Expo Router v4)

Navigation utilizes **file-based routing** with native stack animations:

```
[ Root Navigation Stack ]
   │
   ├── (auth) Group [Modal/Card Stack]
   │     ├── login (Default unauthenticated entry)
   │     ├── register
   │     └── forgot-password
   │
   └── (tabs) Group [Protected Tab Bar — requires active session]
         ├── index (Dashboard: Fleet KPI cards, pond quick-pills, energy, biomass)
         ├── ponds (10-pond fleet grid, status badges, filters)
         ├── intelligence (Multi-horizon weather forecasting & disease vulnerability)
         ├── alerts (Active alarms, acknowledgment buttons, audio chime)
         └── profile (Role switcher, demo mode toggle, farm settings)
   │
   └── Nested Feature Stacks (Push / Modal Transitions)
         ├── ponds/[pondId] (Detailed DO, pH, Temp graph, aerators, feeders)
         ├── aeration/index (Dedicated aerator control grid & emergency boost)
         ├── feeding/index (Feeder status, daily dispensation, CV feed clearing)
         ├── climate/index (Weather forecast, microclimate stratification analysis)
         ├── devices/index (IoT gateways, LoRa signal RSSI, battery monitors)
         └── reports/index (Daily summary PDF/CSV download)
```

---

## 5. Security & Authentication Architecture

1. **Hardware-Backed Secure Storage**:
   - JWT tokens are stored using `expo-secure-store`, backed by Android Keystore (KeyStore hardware security module).
   - Sensitive credentials never touch unencrypted `AsyncStorage`.
2. **Axios Token Interceptor**:
   - Automatically injects `Authorization: Bearer <TOKEN>` on every outbound request.
   - Attaches platform headers: `X-Client-Platform: Android`, `X-Client-Version: 1.0.0`, `X-Device-Id: <UUID>`.
3. **Session Expiry & 401 Re-Authentication**:
   - On HTTP 401, the interceptor clears session tokens, triggers `authStore.logout()`, and redirects to `/(auth)/login`.
4. **Role-Based Feature Guarding**:
   - The UI adapts based on `UserRole` (`ADMIN`, `FARM_MANAGER`, `OPERATOR`, `VIEWER`):
     - **Actuator Buttons (Aerator Start/Stop, Feeder Dispense)**: Disabled for `VIEWER` and `RESEARCHER`.
     - **Farm Settings & System Reset**: Visible exclusively to `ADMIN`.
     - **Recommendation Approval**: Permitted for `ADMIN`, `FARM_MANAGER`, and `OPERATOR`.

---

## 6. Offline-First Resilience & Outbox Architecture

1. **Local SQLite Cache (`expo-sqlite`)**:
   - `cached_ponds`: Offline mirror of 10 ponds with last known water quality metrics.
   - `cached_telemetry`: Circular buffer storing 24-hour sensor history per pond.
   - `command_outbox`: Offline queue storing operator commands dispatched during network blackout.
2. **Command Outbox Schema**:
   ```sql
   CREATE TABLE IF NOT EXISTS command_outbox (
       id TEXT PRIMARY KEY,
       pond_id INTEGER NOT NULL,
       subsystem TEXT NOT NULL,
       target_device_id INTEGER NOT NULL,
       action TEXT NOT NULL,
       payload TEXT,
       created_at TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'QUEUED',
       retry_count INTEGER NOT NULL DEFAULT 0,
       error_message TEXT
   );
   ```
3. **Idempotent Background Synchronization**:
   - Monitored by `@react-native-community/netinfo`.
   - When network flips from `OFFLINE` $\rightarrow$ `ONLINE`, the synchronization engine consumes queued commands in FIFO order via `/api/v1/cloud/remote-command`.
   - Each command carries a unique `command_id` UUID generated locally to ensure backend idempotency.

---

## 7. IoT Safety Validation Architecture (Safety Supremacy)

AquaIntel adheres to the principle: **"No software error or remote command shall suffocate the stock or damage equipment."**

1. **Client-Side Pre-Actuation Interlocks**:
   - **Hypoxia Aeration Lockout**: If Pond DO is $< 3.8\text{ mg/L}$, turning OFF an aerator is strictly blocked on mobile. The operator is shown an emergency lockout warning dialog requiring explicit manager PIN override.
   - **Hypoxia Feeding Cutoff**: If Pond DO is $< 4.0\text{ mg/L}$, dispensing feed is blocked.
   - **Anti-Cycling Hysteresis**: Toggling an aerator ON and OFF within a 120-second window is rejected to protect 3-phase motor contactors from thermal burnout.
2. **Closed-Loop Actuation Lifecycle**:
   - Mobile initiates: `EquipmentCommandRequest` with client timestamp.
   - UI displays animated pending spinner (`COMMAND_SENT`).
   - Backend/Edge acknowledges (`ACKNOWLEDGED`).
   - Physical probe verifies current draw or DO response (`VERIFIED`).

---

## 8. Real-Time Telemetry & Notification Engine

1. **Reconnecting WebSocket (`telemetrySocket.ts`)**:
   - Connects to `/ws/telemetry`.
   - Ingests 3-second live sensor bursts across 10 ponds.
   - Automatically reconnects with exponential backoff ($1\text{s}, 2\text{s}, 4\text{s}, \dots, 30\text{s}$) upon network interruption.
   - Updates Zustand `farmStore` in memory without triggering full-screen re-renders.
2. **Android Push Notification Strategy (Expo Notifications)**:
   - Configures distinct Android Notification Channels:
     - **Critical Alarms (`aquaintel-critical`)**: Importance `MAX`, sound `alarm_chime.wav`, vibration pattern, heads-up display (Hypoxia, Ammonia spike, Aerator trip).
     - **Climate & Weather (`aquaintel-climate`)**: Importance `HIGH` (Rainfall warning, Cyclone alert).
     - **Operational Briefings (`aquaintel-daily`)**: Importance `DEFAULT` (Daily 06:00 AM FCR & Feeding quota).

---

## 9. Android Build & Release Strategy

1. **Toolchain Configuration**:
   - **Expo SDK:** 52
   - **Target Android Version:** Android 14 (API level 34)
   - **Minimum Android Version:** Android 8.0 Oreo (API level 26)
   - **Architecture:** `arm64-v8a`, `armeabi-v7a`
   - **JS Engine:** Hermes (enabled by default for low memory footprint on farm-grade smartphones)
2. **Android Permissions (`app.json`)**:
   ```json
   {
     "permissions": [
       "INTERNET",
       "ACCESS_NETWORK_STATE",
       "CAMERA",
       "READ_EXTERNAL_STORAGE",
       "WRITE_EXTERNAL_STORAGE",
       "VIBRATE",
       "POST_NOTIFICATIONS"
     ]
   }
   ```
3. **Build Flavors**:
   - **Development Build**: `expo run:android` / EAS development profile with local IP debugging.
   - **Staging APK**: Standalone Android APK for on-site farm testing in Nellore.
   - **Production AAB**: Optimized Google Play Store Android App Bundle with ProGuard/R8 dead-code stripping.
