# AquaIntel Android Mobile — Testing & QA Guide

This document details the automated testing architecture, test suites, and quality assurance procedures for the AquaIntel Android Mobile Application (`mobile/`).

---

## 1. Testing Architecture Overview

AquaIntel utilizes a multi-layered testing strategy:

```text
┌─────────────────────────────────────────────────────────────┐
│                   AQUAINTEL MOBILE TEST TIERS               │
│                                                             │
│   [ Unit Tests ]          - Auth & SQLite Cache Purge       │
│                           - Safety Interlocks & Freshness   │
│                           - FarmStore Snapshots & Provenance│
│                           - Notification Token Registration │
│                           - Axios Client & ZodResolver      │
│                                                             │
│   [ Component Tests ]     - RNTL Cards, ChartCard & Nav Bar │
│                           - Modal Confirmations, Login Form │
│                                                             │
│   [ Non-Regression ]      - Backend Pytest Suite (83 Tests) │
│                           - Frontend Web Build & oxlint     │
│                           - Expo Android Hermes Export      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Executing Automated Tests

### 2.1 Mobile Test Suite (Jest & React Native Testing Library)
```bash
cd mobile && npm test
```

### 2.2 TypeScript Static Typecheck
```bash
cd mobile && npm run typecheck
```
Executes `tsc --noEmit` across all screens, Expo Router files, stores, API clients, and tests.

### 2.3 Android Hermes Bundle Compilation
```bash
cd mobile && HOME=/tmp EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist-android && rm -rf dist-android
```

### 2.4 Backend & Web Non-Regression Verification
```bash
# Backend automated pytest suite (83 tests)
backend/venv/bin/pytest backend/tests

# Frontend React 19 production build & lint
cd frontend && npm run build && npm run lint
```

---

## 3. Test Suites Inventory

| Test File | Scope | Verified Coverage | Status |
|---|---|---|---|
| `tests/unit/auth.test.ts` | Session & Storage | Login success, SecureStore token persistence, error handling, logout `offlineDatabase.clearAllCache()` & session purge | **PASS** |
| `tests/unit/safety.test.ts` | Safety Interlocks | Hypoxia lockout (`DO < 3.8 mg/L` blocks Stop), Feeding lockout (`DO < 4.0 mg/L` blocks Dispense), Freshness window (`> 60s` stale), offline guard | **PASS** |
| `tests/unit/farmStore.test.ts` | State Machine | Live metric updates, offline transition, provenance derivation (`LIVE`, `STALE`, `CACHED`, `OFFLINE`) | **PASS** |
| `tests/unit/storeAndLogin.test.tsx` | Snapshots, Form & Auth UI | `updateFleetFromSnapshot` (`DEMO`/`STALE`/`OFFLINE`), `zodResolver`, `LoginScreen` validation & absence of hardcoded demo credentials | **PASS** |
| `tests/unit/notifications.test.ts` | Push Notifications | Android notification channels & graceful skip when Play Services / push provider unavailable | **PASS** |
| `tests/unit/apiClient.test.ts` | Networking | Default timeouts, platform headers, idempotency UUID generator | **PASS** |
| `tests/components/components.test.tsx` | UI Components | `StatusBadge`, `MetricCard`, `ConfirmationDialog`, `SensorStatusCard` (normal/critical/unavailable/stale `water_level`), `ChartCard`, `BottomNavigation` | **PASS** |

---

## 4. Manual QA Checklist for Physical Android / Emulator Environments

Because `adb`, Android Emulator, Gradle, and `eas` CLI are not installed on the current macOS development workstation, the following checks must be performed on an Android device or emulator environment prior to field release:

1. **Navigation & Android Back Gesture:** Verify hardware/gesture back behavior across nested routes (`/ponds/[pondId]`, `/water-quality/[pondId]`, `/devices/[deviceId]`, `/feeding/history`) and root tabs.
2. **Real-Time LAN / Emulator Networking:** Configure `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL`, toggle Airplane Mode to verify `OfflineBanner` and actuator lockout, and restore Wi-Fi/cellular to verify WebSocket resumption.
3. **Outdoor Daylight Legibility & Charts:** Inspect high-contrast light theme (`#247653` on `#F6F8F6`) and SVG line/band chart gestures under sunlight.
4. **End-to-End Push Delivery:** Configure Google Firebase Cloud Messaging (FCM V1) in EAS and test physical device notification receipt.
