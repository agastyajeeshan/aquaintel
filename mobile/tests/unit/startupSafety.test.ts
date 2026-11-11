import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getDatabase } from '../../src/services/storage/database';
import { secureStorage } from '../../src/services/storage/secureStore';
import { offlineDatabase } from '../../src/services/storage/database';
import { useAuthStore } from '../../src/store/authStore';

describe('Mobile Startup Crash Resilience Tests', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOs, configurable: true });
    jest.restoreAllMocks();
  });

  test('getDatabase returns null cleanly on web without invoking ExpoSQLite', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const db = await getDatabase();
    expect(db).toBeNull();
  });

  test('importing database module succeeds even if expo-sqlite native module is unavailable', async () => {
    jest.resetModules();
    jest.doMock('expo-sqlite', () => {
      throw new Error("Cannot find native module 'ExpoSQLite'");
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { getDatabase: isolatedGetDatabase } = require('../../src/services/storage/database');
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

    const db = await isolatedGetDatabase();
    expect(db).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    jest.dontMock('expo-sqlite');
    jest.resetModules();
  });

  test('secureStorage safely handles native KeyStore read and delete failures', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(SecureStore, 'getItemAsync').mockRejectedValueOnce(new Error('KeyStore locked'));
    jest.spyOn(SecureStore, 'deleteItemAsync').mockRejectedValueOnce(new Error('KeyStore error'));

    const token = await secureStorage.getAccessToken();
    expect(token).toBeNull();

    await expect(secureStorage.clearAllSession()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  test('restoreSession finishes cleanly with isLoading=false even when storage cleanup fails', async () => {
    jest.spyOn(secureStorage, 'getAccessToken').mockRejectedValueOnce(new Error('SecureStore unavailable'));
    jest.spyOn(secureStorage, 'clearAllSession').mockRejectedValueOnce(new Error('Clear failed'));
    jest.spyOn(offlineDatabase, 'clearAllCache').mockRejectedValueOnce(new Error('SQLite failed'));

    await useAuthStore.getState().restoreSession();

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });
});
