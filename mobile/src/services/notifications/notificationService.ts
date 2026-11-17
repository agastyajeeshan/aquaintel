import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { alertsApi } from '../api/alerts.api';
import { secureStorage } from '../storage/secureStore';

// Configure foreground notification behavior safely on native platforms
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    console.warn('[AquaIntel Notifications] Failed to initialize notification handler:', err);
  }
}

/**
 * Configure Android notification channels for AquaIntel operational tiers.
 */
async function setupAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // 1. Critical Hypoxia & Equipment Safety Alerts
    await Notifications.setNotificationChannelAsync('critical_alerts', {
      name: 'Critical Pond Alerts',
      description: 'Emergency hypoxia, DO drop, equipment shutdown, and biosecurity alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#DC2626',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // 2. Backward compatibility channel for existing alerts
    await Notifications.setNotificationChannelAsync('emergency_alerts', {
      name: 'Emergency Pond Alerts (Legacy)',
      description: 'Emergency safety and hypoxia alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#DC2626',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
    });

    // 3. Water Quality Warnings & Early Anomaly Detection
    await Notifications.setNotificationChannelAsync('warnings', {
      name: 'Warnings & Deviations',
      description: 'Water quality parameter deviations, high ammonia, and pH drift',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
    });

    // 4. Advisories & AI Smart Feeding Recommendations
    await Notifications.setNotificationChannelAsync('advisories', {
      name: 'Advisories & Recommendations',
      description: 'Feeding adjustments, weather advisories, and harvest recommendations',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#3B82F6',
      showBadge: true,
    });

    // 5. Routine Farm Connectivity & Telemetry Updates
    await Notifications.setNotificationChannelAsync('routine', {
      name: 'Routine Status & Telemetry',
      description: 'Daily farm summaries and routine connectivity updates',
      importance: Notifications.AndroidImportance.LOW,
      showBadge: false,
    });
  } catch (err) {
    console.warn('[AquaIntel Notifications] Failed setting up Android channels:', err);
  }
}

export const notificationService = {
  /**
   * Sets up Android channels and requests permissions to register a valid Expo push token.
   * Gracefully handles permission denial and devices/emulators without push support.
   * Never registers synthetic/mock tokens with the backend.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      // 1. Configure Android notification channels
      await setupAndroidNotificationChannels();

      // 2. Inspect notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.info('[AquaIntel Notifications] Push notification permission not granted.');
        return null;
      }

      // 3. Retrieve EAS project ID
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId ??
        'aquaintel-commercial-farm-mobile';

      // 4. Request real Expo push token
      let token: string | null = null;
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        token = tokenData?.data ?? null;
      } catch (tokenErr: any) {
        // Without Google Play Services, FCM credentials, or network, token acquisition will fail.
        // Log gracefully and avoid emitting false mock tokens to backend.
        console.warn(
          '[AquaIntel Notifications] Push token retrieval skipped (emulator or unconfigured push provider):',
          tokenErr?.message || tokenErr
        );
        return null;
      }

      if (!token || typeof token !== 'string') {
        return null;
      }

      // 5. Securely persist token and register with AquaIntel backend
      await secureStorage.setPushToken(token);
      const deviceId = await secureStorage.getDeviceUUID();

      try {
        await alertsApi.registerPushToken(token, Platform.OS, deviceId);
      } catch (apiErr) {
        console.warn('[AquaIntel Notifications] Backend push token registration failed:', apiErr);
      }

      return token;
    } catch (e) {
      console.warn('[AquaIntel Notifications] Error configuring push notifications:', e);
      return null;
    }
  },

  /**
   * Unregisters push token on backend and clears local storage upon session logout.
   */
  async unregisterPushTokenAsync(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const token = await secureStorage.getPushToken();
      if (token) {
        try {
          await alertsApi.unregisterPushToken(token);
        } catch (apiErr) {
          console.warn('[AquaIntel Notifications] Backend push unregistration failed:', apiErr);
        }
        await secureStorage.removePushToken();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[AquaIntel Notifications] Error during push token unregistration:', err);
      return false;
    }
  },

  /**
   * Safe retrieval of cold-start notification response.
   */
  async getLastNotificationResponseAsync(): Promise<Notifications.NotificationResponse | null> {
    if (Platform.OS === 'web') return null;
    try {
      return await Notifications.getLastNotificationResponseAsync();
    } catch {
      return null;
    }
  },

  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    if (Platform.OS === 'web') {
      return { remove: () => {} };
    }
    try {
      return Notifications.addNotificationReceivedListener(callback);
    } catch {
      return { remove: () => {} };
    }
  },

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    if (Platform.OS === 'web') {
      return { remove: () => {} };
    }
    try {
      return Notifications.addNotificationResponseReceivedListener(callback);
    } catch {
      return { remove: () => {} };
    }
  },
};
