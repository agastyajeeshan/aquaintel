import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/services/api/auth.api';
import { secureStorage } from '../../src/services/storage/secureStore';

jest.mock('../../src/services/api/auth.api');

describe('Auth Store & Secure Session Unit Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await secureStorage.clearAllSession();
    useAuthStore.setState({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  test('login successfully authenticates and stores access token', async () => {
    const mockTokenRes = {
      access_token: 'mock_jwt_token_12345',
      token_type: 'bearer',
      role: 'OPERATOR' as const,
      username: 'operator',
      full_name: 'B. Venkat (Shift Field Lead)',
    };

    (authApi.login as jest.Mock).mockResolvedValueOnce(mockTokenRes);
    (authApi.getMe as jest.Mock).mockResolvedValueOnce({
      id: 1,
      username: 'operator',
      full_name: 'B. Venkat (Shift Field Lead)',
      role: 'OPERATOR',
      email: 'operator@aquaintel.farm',
    });

    const success = await useAuthStore.getState().login('operator', 'operator123');

    expect(success).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().role).toBe('OPERATOR');
    expect(useAuthStore.getState().token).toBe('mock_jwt_token_12345');

    const storedToken = await secureStorage.getAccessToken();
    expect(storedToken).toBe('mock_jwt_token_12345');
  });

  test('login failure handles error and leaves user unauthenticated', async () => {
    (authApi.login as jest.Mock).mockRejectedValueOnce({
      message: 'Incorrect username or password',
    });

    const success = await useAuthStore.getState().login('invalid_user', 'wrong_pass');

    expect(success).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().error).toBe('Incorrect username or password');
  });

  test('logout purges token from SecureStore and resets auth state', async () => {
    await secureStorage.setAccessToken('active_session_token');
    useAuthStore.setState({
      user: { id: 1, username: 'operator', full_name: 'Operator', role: 'OPERATOR', email: 'op@test.com' },
      token: 'active_session_token',
      role: 'OPERATOR',
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();

    const stored = await secureStorage.getAccessToken();
    expect(stored).toBeNull();
  });
});
