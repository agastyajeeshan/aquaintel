import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN: 'aquaintel_access_token',
  USER_ROLE: 'aquaintel_user_role',
  USER_PROFILE: 'aquaintel_user_profile',
  DEVICE_UUID: 'aquaintel_device_uuid',
  PUSH_TOKEN: 'aquaintel_push_token',
} as const;

// Web fallback in memory if running in web preview
const webStorage = new Map<string, string>();

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webStorage.get(key) || null;
  }
  return await SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = {
  async getAccessToken(): Promise<string | null> {
    return getItem(KEYS.ACCESS_TOKEN);
  },

  async setAccessToken(token: string): Promise<void> {
    await setItem(KEYS.ACCESS_TOKEN, token);
  },

  async removeAccessToken(): Promise<void> {
    await deleteItem(KEYS.ACCESS_TOKEN);
  },

  async getDeviceUUID(): Promise<string> {
    let uuid = await getItem(KEYS.DEVICE_UUID);
    if (!uuid) {
      uuid = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      await setItem(KEYS.DEVICE_UUID, uuid);
    }
    return uuid;
  },

  async getPushToken(): Promise<string | null> {
    return getItem(KEYS.PUSH_TOKEN);
  },

  async setPushToken(token: string): Promise<void> {
    await setItem(KEYS.PUSH_TOKEN, token);
  },

  async removePushToken(): Promise<void> {
    await deleteItem(KEYS.PUSH_TOKEN);
  },

  async clearAllSession(): Promise<void> {
    await deleteItem(KEYS.ACCESS_TOKEN);
    await deleteItem(KEYS.USER_ROLE);
    await deleteItem(KEYS.USER_PROFILE);
  },
};
