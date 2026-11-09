# AquaIntel Android Mobile — Development & Engineering Guide

**Technology:** React Native (Expo SDK 52) • TypeScript • Expo Router • TanStack Query • Zustand • Expo SQLite  
**Target:** Android (SDK 34+)  
**Application ID:** `com.aquaintel.mobile`  

---

## 1. Prerequisites & Environment Setup

Ensure the following tools are installed:
- **Node.js:** 18+ (Verified on v24.22.1)
- **npm:** 9+ (Verified on 11.19.1)
- **Python:** 3.10+ (Verified on 3.15.1 for FastAPI backend)
- **Expo CLI:** Built-in via `npx expo`
- **Android Studio / Android SDK:** (Optional for local emulator execution, build tools SDK 34+)

---

## 2. Quickstart Instructions

### Step 1: Start the FastAPI Backend
In your first terminal tab:
```bash
cd backend
source venv/bin/activate
python run.py
```
- API Base: `http://localhost:8000/api`
- Interactive Swagger: `http://localhost:8000/docs`
- WebSocket Telemetry: `ws://localhost:8000/ws/telemetry`

### Step 2: Configure Mobile Environment
Copy the example environment file:
```bash
cd mobile
cp .env.example .env
```
Default `.env` configuration:
```ini
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:8000/ws/telemetry
EXPO_PUBLIC_DEMO_MODE=true
EXPO_PUBLIC_DEFAULT_FARM_ID=1
EXPO_PUBLIC_REQUEST_TIMEOUT_MS=15000
```

### Step 3: Install Node Dependencies
```bash
cd mobile
npm install
```

### Step 4: Launch the Expo Development Server
```bash
cd mobile
npm run start
```
From the interactive terminal menu:
- Press `a` to open on an active Android emulator or connected device via ADB.
- Press `w` to open in browser web preview.
- Scan the displayed QR code with the **Expo Go** app on a physical Android device connected to the same LAN.

---

## 3. Connecting to Different Networking Environments

### A. Android Emulator (Standard Google APIs Image)
The Android QEMU emulator runs behind a virtual router.
- Use `http://10.0.2.2:8000/api` for HTTP.
- Use `ws://10.0.2.2:8000/ws/telemetry` for WebSocket.
- Do NOT use `localhost` or `127.0.0.1`.

### B. Physical Android Device (Over Wi-Fi)
1. Find your development laptop's local LAN IP:
   ```bash
   ipconfig getifaddr en0 # On macOS (e.g., 192.168.1.45)
   ```
2. Update `mobile/.env`:
   ```ini
   EXPO_PUBLIC_API_URL=http://192.168.1.45:8000/api
   EXPO_PUBLIC_WS_URL=ws://192.168.1.45:8000/ws/telemetry
   ```
3. Ensure your workstation firewall permits inbound traffic on port 8000.

### C. Physical Android Device via ADB Reverse (USB Tethering)
If Wi-Fi communication is restricted:
```bash
adb reverse tcp:8000 tcp:8000
```
Then configure `EXPO_PUBLIC_API_URL=http://localhost:8000/api`.

---

## 4. Operational Demo User Accounts

The local development backend comes pre-seeded with 4 standard commercial farm accounts:

| Role | Username | Password | Full Name & Operational Scope |
|---|---|---|---|
| **Operator** | `operator` | `operator123` | B. Venkat (Shift Field Lead) — Pond inspections, feeder bursts, aeration commands |
| **Farm Manager** | `manager` | `farm123` | V. Naresh (Farm GM) — Quota approvals, fleet oversight, alert triage |
| **Admin** | `admin` | `admin123` | Dr. K. Srinivas (Agritech Director) — Full system access, audit logs, user management |
| **Viewer** | `viewer` | `viewer123` | Rajiv Menon (Analyst) — Read-only telemetry, reports, and charts |

---

## 5. Development Scripts

Inside `mobile/`:
- `npm run start`: Starts Metro bundler.
- `npm run android`: Starts Metro and attempts ADB launch.
- `npm run typecheck`: Runs `tsc --noEmit` across all screens and components.
- `npm test`: Runs Jest unit, component, and safety test suites.
- `npm run test:coverage`: Generates code coverage report.
