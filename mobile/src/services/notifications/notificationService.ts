import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { alertsApi } from '../api/alerts.api';
import { secureStorage } from '../storage/secureStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'aquaintel-commercial-farm-mobile',
      }).catch((e) => {
        // Fallback for local emulator or unconfigured EAS project
        console.warn('Push token retrieval notice:', e.message);
        return { data: 'ExponentPushToken[mock-local-token]' };
      });

      const token = tokenData.data;
      if (token) {
        await secureStorage.setPushToken(token);
        const deviceId = await secureStorage.getDeviceUUID();
        try {
          await alertsApi.registerPushToken(token, Platform.OS, deviceId);
        } catch (e) {
          console.warn('Failed to register push token with backend:', e);
        }
      }

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('emergency_alerts', {
          name: 'Emergency Hypoxia & Safety Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#DC2626',
        });
      }

      return token;
    } catch (e) {
      console.warn('Error configuring push notifications:', e);
      return null;
    }
  },

  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  },

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },
};
