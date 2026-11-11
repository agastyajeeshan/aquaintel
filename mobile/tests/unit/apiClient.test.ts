import { apiClient } from '../../src/services/api/client';
import { secureStorage } from '../../src/services/storage/secureStore';

describe('API Client & Interceptor Unit Tests', () => {
  beforeEach(async () => {
    await secureStorage.clearAllSession();
  });

  test('apiClient sets default headers and timeout correctly', () => {
    expect(apiClient.defaults.timeout).toBe(15000);
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    expect(apiClient.defaults.headers['X-Client-Platform']).toBeDefined();
    expect(apiClient.defaults.headers['X-Client-Version']).toBe('1.0.0');
  });

  test('secureStorage returns persistent device UUID for idempotency', async () => {
    const uuid1 = await secureStorage.getDeviceUUID();
    const uuid2 = await secureStorage.getDeviceUUID();

    expect(uuid1).toBeDefined();
    expect(uuid1.startsWith('dev_')).toBe(true);
    expect(uuid1).toBe(uuid2); // Idempotent across requests
  });
});
