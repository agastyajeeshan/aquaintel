# AquaIntel Android Mobile — Testing & QA Guide

This document details the automated testing architecture, test suites, and quality assurance procedures for the AquaIntel Android Mobile Application (`mobile/`).

---

## 1. Testing Architecture Overview

AquaIntel utilizes a multi-layered testing strategy:

```
┌─────────────────────────────────────────────────────────────┐
│                   AQUAINTEL MOBILE TEST TIERS               │
│                                                             │
│   [ Unit Tests ]          - Store State, Safety Interlocks  │
│                           - Freshness Rules, Data Adapters  │
│                                                             │
│   [ Component Tests ]     - RNTL Card & Gauge Rendering     │
│                           - Modal Confirmations, Badge States│
│                                                             │
│   [ Non-Regression ]      - Backend Pytest Suite (71 Tests) │
│                           - Frontend Web Build (0 Errors)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Executing Automated Tests

### 2.1 Mobile Test Suite (Jest & React Native Testing Library)
Run all mobile unit and component tests:
```bash
cd mobile
npm test
```

### 2.2 Test Coverage Analysis
```bash
cd mobile
npm run test:coverage
```

### 2.3 TypeScript Static Typecheck
```bash
cd mobile
npm run typecheck
```
Executes `tsc --noEmit` across all screens, router files, state stores, and shared components.

### 2.4 End-to-End Non-Regression Verification
Verify that backend APIs and web frontend remain fully operational:
```bash
# 1. Backend 71-test automated suite
backend/venv/bin/pytest backend/tests -v

# 2. Frontend React 19 build validation
cd frontend && npm run build
```

---

## 3. Test Suites Inventory

| Test File | Scope | Test Cases | Status |
|---|---|---|---|
| `tests/unit/auth.test.ts` | Session & SecureStore | Login success, token persistence, error handling, session restoration, logout cache clearing | **PASS** |
| `tests/unit/safety.test.ts` | Safety Interlocks | Hypoxia lockout (DO < 3.8 mg/L blocks Stop), Feeding lockout (DO < 4.0 mg/L blocks Dispense), Freshness window (> 60s marked stale) | **PASS** |
| `tests/unit/farmStore.test.ts` | State Machine | Telemetry injection, offline detection, provenance derivation (LIVE, STALE, CACHED, OFFLINE) | **PASS** |
| `tests/unit/apiClient.test.ts` | Networking | Default timeouts, headers, device UUID idempotency key generator | **PASS** |
| `tests/components/components.test.tsx` | UI Components | `StatusBadge` states, `MetricCard` formatting, `ConfirmationDialog` safety notice and callbacks, `SensorStatusCard` critical ranges | **PASS** |

---

## 4. Manual QA Test Matrix for Android Devices

When testing on an Android device or emulator, verify the following checklist:

### A. Navigation & Back Handling
- Pressing the Android hardware / gesture back button on detail pages (`/ponds/4`, `/feeding`, `/aeration`) returns smoothly to the previous tab without exiting the app.
- Back button on root tab screens minimizes the app cleanly according to Android OS conventions.

### B. Outdoor Sunlight Legibility
- Light theme high contrast verified: `#247653` primary green against `#F6F8F6` background.
- Large metric readouts (32sp / 24sp) remain legible under direct outdoor sunlight on pond dikes.

### C. Offline Behavior & Graceful Degradation
1. Open the app with Wi-Fi connected to sync live telemetry.
2. Toggle Android Airplane Mode.
3. Verify `OfflineBanner` appears immediately with exact last-synced timestamp.
4. Verify all aerator and feeder action buttons raise an "Offline Action Blocked" alert rather than hanging or dispatching queued commands.
5. Disable Airplane Mode; verify automatic reconnection and WebSocket resumption.
