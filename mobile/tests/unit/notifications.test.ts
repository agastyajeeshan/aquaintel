import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService } from '../../src/services/notifications/notificationService';
import { alertsApi } from '../../src/services/api/alerts.api';
import { secureStorage } from '../../src/services/storage/secureStore';

jest.mock('../../src/services/api/alerts.api', () => ({
  alertsApi: {
    registerPushToken: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
    unregisterPushToken: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
  },
}));

describe('Notification Service — Push Notification Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'android';
  });

  it('gracefully returns null when notification permission is denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });

    const token = await notificationService.registerForPushNotificationsAsync();

    expect(token).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(alertsApi.registerPushToken).not.toHaveBeenCalled();
  });

  it('gracefully returns null and never generates fake tokens when getExpoPushTokenAsync fails', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Google Play Services not available on emulator')
    );

    const token = await notificationService.registerForPushNotificationsAsync();

    // Must be null, NOT mock-local-token
    expect(token).toBeNull();
    expect(alertsApi.registerPushToken).not.toHaveBeenCalled();
  });

  it('successfully registers real push token and configures Android notification channels', async () => {
    const validToken = 'ExponentPushToken[AbCdEf1234567890XyZ]';
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({ data: validToken });

    const token = await notificationService.registerForPushNotificationsAsync();

    expect(token).toBe(validToken);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'critical_alerts',
      expect.objectContaining({
        importance: Notifications.AndroidImportance.MAX,
        lightColor: '#DC2626',
      })
    );
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'warnings',
      expect.objectContaining({
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#F59E0B',
      })
    );
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'advisories',
      expect.objectContaining({
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#3B82F6',
      })
    );
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'routine',
      expect.objectContaining({
        importance: Notifications.AndroidImportance.LOW,
      })
    );

    // Verify backend registration call
    expect(alertsApi.registerPushToken).toHaveBeenCalledWith(
      validToken,
      'android',
      expect.any(String)
    );

    // Verify token persisted in secure store
    const stored = await secureStorage.getPushToken();
    expect(stored).toBe(validToken);
  });

  it('unregisters push token on logout and clears storage', async () => {
    await secureStorage.setPushToken('ExponentPushToken[TestLogoutToken]');

    const result = await notificationService.unregisterPushTokenAsync();

    expect(result).toBe(true);
    expect(alertsApi.unregisterPushToken).toHaveBeenCalledWith('ExponentPushToken[TestLogoutToken]');
    const stored = await secureStorage.getPushToken();
    expect(stored).toBeNull();
  });

  it('registers notification response listener for deep linking', () => {
    const callback = jest.fn();
    notificationService.addNotificationResponseReceivedListener(callback);

    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(callback);
  });
});
