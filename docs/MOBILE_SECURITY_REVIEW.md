# AquaIntel Android Mobile — Security & Compliance Review

**Application ID:** `com.aquaintel.mobile`  
**Security Classification:** Mission-Critical Agritech Automation  
**Date:** November 2026

---

## 1. Security Architecture & Threat Model

AquaIntel manages physical aerators, auto-feeders, and water pump grids for commercial aquaculture. Security or safety bypasses could cause severe financial loss, motor damage, or stock mortality.

The mobile application and backend jointly enforce a **defense-in-depth security model**:

```text
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE SECURITY PERIMETER                │
├─────────────────────────────────────────────────────────────┤
│  1. Hardware-Backed Keystore (Expo SecureStore)             │
│     - Encrypted storage for JWT Bearer tokens               │
│     - Device UUID hardware binding                          │
│                                                             │
│  2. Strict Role-Based Access Control (RBAC)                 │
│     - ADMIN: Full configuration & audit trails              │
│     - FARM_MANAGER: Quota approvals & climate approvals     │
│     - OPERATOR: Actuations & observations within safety     │
│     - VIEWER: Read-only observation                         │
│     - Public /auth/register blocks ADMIN escalation (403)   │
│                                                             │
│  3. Anti-Replay & Idempotency Protection                    │
│     - Client-generated UUID command_id on actuations        │
│     - Server-side command expiration TTL                    │
│                                                             │
│  4. Dual Client + Server Safety Interlocks                  │
│     - Aerator STOP blocked (409) if DO < 3.8 mg/L or stale  │
│     - Feeder DISPENSE/START blocked (409) if DO < 4.0 mg/L, │
│       NH3/TAN > 0.10 mg/L, quota exceeded, or probe stale   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Security Verification Items

### 2.1 No Hardcoded Credentials, Secrets, or Location PII
- **Audit Result:** PASSED.
- No hardcoded passwords, quick-demo credential buttons, personal operator names, or hardcoded farm coordinates remain in `mobile/app/` or `mobile/src/`.
- Verified via source search and automated `LoginScreen` component tests (`tests/unit/storeAndLogin.test.tsx`).

### 2.2 Public Privilege Escalation Prevention
- **Audit Result:** PASSED (`backend/tests/test_auth_and_security.py`).
- `POST /api/v1/auth/register` validates requested roles and returns `403 Forbidden` if a caller attempts to register with `role: "ADMIN"`.
- Both mobile `register.tsx` and Zod validation schemas restrict selectable roles to `OPERATOR`, `FARM_MANAGER`, and `VIEWER`.

### 2.3 Secure Storage & Logout Data Hygiene
- Tokens are stored exclusively using `expo-secure-store` (Android KeyStore) and never written to plain-text files or SQLite tables.
- Calling `logout()` purges tokens from `SecureStore`, clears cached SQLite telemetry/alert rows via `offlineDatabase.clearAllCache()`, and resets Zustand auth state.
- Any HTTP `401 Unauthorized` response automatically invokes `onUnauthorizedCallback` to terminate the session.

### 2.4 Authenticated Telemetry Export
- CSV exports are fetched via Axios with the caller's Bearer JWT token (`reportsApi.downloadCsvReport`) and shared through native share intents without embedding credentials in query parameters.

### 2.5 Server-Enforced Safety & Offline Actuation Lockout
- Actuations are blocked offline in the mobile client (`safetyGuard`); unsafe actuator commands are **never** queued in SQLite for deferred offline replay.
- Even if client validation were bypassed, `POST /api/v1/aeration/{id}/control` and `POST /api/v1/feeding/{id}/control` re-validate sensor health, staleness, hypoxia thresholds, ammonia thresholds, and user role server-side, rejecting unsafe commands with HTTP `409 Conflict` (or `403 Forbidden`) and recording `AERATOR_COMMAND_REJECTED` / audit events.
