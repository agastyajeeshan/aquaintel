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
| **Local Export** | Hermes JS Bundle & Assets | Verifies complete compilation & bundling | `npx expo export --platform android` |

---

## 2. Generating a Standalone Android Preview APK

To create an installable `.apk` file for testing on physical Android devices:

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Log into Expo Account
```bash
eas login
```

### Step 3: Run the Cloud Preview Build
Inside the `mobile/` directory:
```bash
cd mobile
eas build --profile preview --platform android
```
EAS builds the complete standalone APK in the cloud, generating an installable `.apk` download link upon completion.

---

## 3. Generating a Production Android App Bundle (AAB)

To prepare the signed production bundle for the Google Play Console:

```bash
cd mobile
eas build --profile production --platform android
```
EAS generates `com.aquaintel.mobile.aab` with Android Keystore signing and R8/ProGuard optimizations enabled.

---

## 4. Local Hermes Bundle Verification

You can verify that all 2,800+ JavaScript modules, SVG charts, and assets compile to Hermes bytecode locally without an active EAS cloud build:

```bash
cd mobile
HOME=/tmp EXPO_NO_TELEMETRY=1 npx expo export --platform android --output-dir dist-android
```

Expected output:
```
Android node_modules/expo-router/entry.js 100.0% (2816/2816)
Exported: dist-android
_expo/static/js/android/entry-xxxxxxxx.hbc (Hermes bytecode binary)
```

---

## 5. Android Permissions Inventory

The following permissions are configured in `mobile/app.json`:

```json
"permissions": [
  "INTERNET",
  "ACCESS_NETWORK_STATE",
  "POST_NOTIFICATIONS",
  "RECEIVE_BOOT_COMPLETED",
  "VIBRATE"
]
```

- **`INTERNET`**: Communicates with the FastAPI backend and WebSocket telemetry stream.
- **`ACCESS_NETWORK_STATE`**: Detects cellular/Wi-Fi connection drops to activate offline SQLite fallback mode.
- **`POST_NOTIFICATIONS`**: Dispatches emergency hypoxia and equipment failure push notifications (Android 13+).
- **`RECEIVE_BOOT_COMPLETED` & `VIBRATE`**: Critical audible alerts for emergency bio-security incidents.
