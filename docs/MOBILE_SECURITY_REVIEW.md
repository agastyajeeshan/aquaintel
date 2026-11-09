# AquaIntel Android Mobile — Security & Compliance Review

**Application ID:** `com.aquaintel.mobile`  
**Security Classification:** Mission-Critical Agritech Automation  
**Date:** November 2026  

---

## 1. Security Architecture & Threat Model

AquaIntel manages physical aerators, auto-feeders, and water pump grids for high-density commercial aquaculture. Security vulnerabilities in mobile devices could cause severe financial loss, equipment damage, or catastrophic shrimp crop mortality.

The application enforces a **defense-in-depth security model**:

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE SECURITY PERIMETER                │
├─────────────────────────────────────────────────────────────┤
│  1. Hardware-Backed Keystore (Expo SecureStore)             │
│     - AES-256 encrypted storage for JWT Bearer tokens       │
│     - Device UUID hardware binding                          │
│                                                             │
│  2. Strict Role-Based Access Control (RBAC)                 │
│     - ADMIN: Full configuration & audit trails              │
│     - FARM_MANAGER: Feeder quotas & climate approvals       │
│     - OPERATOR: Actuations within verified safety limits    │
│     - VIEWER: Read-only observation                         │
│                                                             │
│  3. Anti-Replay & Idempotency Protection                    │
│     - Client-generated UUID `command_id` on actuations      │
│     - 300-second command expiration TTL                     │
│                                                             │
│  4. Local Edge Controller Interlocks (Zero Trust Client)   │
│     - Cloud/Mobile cannot turn off aerator if DO < 3.8 mg/L │
│     - Feeder blocked if DO < 4.0 mg/L                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Security Verification Items

### 2.1 No Hardcoded Secrets or Passwords
- **Audit Result:** PASSED.
- No production API keys, database credentials, or secret passwords exist in the mobile codebase.
- The pre-seeded demo accounts in `login.tsx` are documented test accounts matching the local mock backend only.

### 2.2 Secure Storage Implementation
- Tokens are stored exclusively using `expo-secure-store`, backed by Android KeyStore with hardware encryption (Keymaster / TEE).
- Tokens are never persisted in plain-text `AsyncStorage`, world-readable files, or unencrypted SQLite rows.

### 2.3 Network Security & TLS Configuration
- Production connections require TLS 1.3 (`https://`, `wss://`).
- Android Cleartext Traffic is restricted in production builds. In development profiles, `10.0.2.2` and local LAN subnets are permitted via development manifests.

### 2.4 Session Revocation & Logout Purge
- Calling `logout()` immediately purges access tokens from `SecureStore`.
- Any HTTP `401 Unauthorized` response immediately triggers `onUnauthorizedCallback`, clearing local session state and resetting memory stores.

### 2.5 Actuation Safety & Offline Guard
- Actuations cannot occur offline. Unsafe commands are **never** stored in an offline queue for deferred replay.
- Every actuation requires double confirmation with explicit display of current DO levels and safety interlocks.
