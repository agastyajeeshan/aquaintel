# AquaIntel Android Application — Build & Release Delivery Guide

**Application Display Name:** AquaIntel  
**Android Package Identifier:** `com.aquaintel.mobile`  
**Build System:** Expo Application Services (EAS) & Local Expo Metro CLI  
**Target Platform:** Android (minSdkVersion: 24, targetSdkVersion: 34)

---

## 1. Build Artifact Types

| Build Profile | Output Format | Purpose | Command |
|---|---|---|---|
| **Development** | Dev Client APK | Local iterative development with debugger | `eas build --profile development --platform android` |
| **Preview** | Standalone APK | Direct sideloading on farmer/manager Android devices | `eas build --profile preview --platform android` |
| **Production** | Android App Bundle (AAB) | Google Play Store publication & store distribution | `eas build --profile production --platform android` |
| **Local Export** | Hermes JS Bundle & Assets | Verifies complete JS/TS compilation & asset bundling | `npx expo export --platform android` |

> [!NOTE]
> Local Hermes bundle verification (`npx expo export --platform android`) runs purely in Node/Metro and is verified in this repository. Generating binary `.apk` or `.aab` files requires either EAS cloud credentials (`eas-cli` + Expo account) or a local Android SDK + NDK + Gradle toolchain (`npx expo prebuild --platform android`).

---

## 2. Generating a Standalone Android Preview APK

### Step 1: Install & Authenticate EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Step 2: Run the Cloud Preview Build
```bash
cd mobile
eas build --profile preview --platform android
```
EAS builds the standalone APK in the cloud and provides a downloadable `.apk` artifact link upon completion.

---

## 3. Generating a Production Android App Bundle (AAB)

```bash
cd mobile
eas build --profile production --platform android
```
EAS generates a signed `.aab` bundle configured with `com.aquaintel.mobile` and Android release optimizations.

---

## 4. Local Hermes Bundle Verification (Verified Offline)

Verify that all JavaScript/TypeScript modules, SVG charts, and Expo Router routes compile cleanly to Android Hermes bytecode:

```bash
cd mobile
HOME=/tmp EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist-android
```

Observed verification output on macOS workstation:
```text
Android Bundled 2740ms node_modules/expo-router/entry.js (2832 modules)
Assets: 23 bundled assets
_expo/static/js/android/entry-1e765664aba50480e430a408fcfdec72.hbc (5.77 MB)
Exported: dist-android
```
Clean up the temporary bundle output before committing:
```bash
rm -rf mobile/dist-android
```

---

## 5. Android Permissions Inventory (`mobile/app.json`)

```json
"permissions": [
  "INTERNET",
  "ACCESS_NETWORK_STATE",
  "POST_NOTIFICATIONS",
  "RECEIVE_BOOT_COMPLETED",
  "VIBRATE"
]
```

- **`INTERNET`**: Communicates with FastAPI HTTP REST API and `/ws/telemetry` WebSocket stream.
- **`ACCESS_NETWORK_STATE`**: Detects connectivity drops to transition cleanly into read-only SQLite cached mode.
- **`POST_NOTIFICATIONS`**, **`RECEIVE_BOOT_COMPLETED`**, **`VIBRATE`**: Supports high-priority Android hypoxia and biosecurity notifications on Android 13+.
