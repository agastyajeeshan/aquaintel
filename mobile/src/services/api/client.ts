import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { ENV } from '../../constants';
import { secureStorage } from '../storage/secureStore';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Platform': Platform.OS === 'android' ? 'Android' : 'iOS',
    'X-Client-Version': '1.0.0',
  },
});

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

// Request interceptor to attach JWT token and Device-Id
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await secureStorage.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const deviceId = await secureStorage.getDeviceUUID();
      if (deviceId && config.headers) {
        config.headers['X-Device-Id'] = deviceId;
      }
    } catch (e) {
      // Proceed without token if secure store fails
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling & session expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const status = error.response?.status || 0;
    const data = error.response?.data;

    let message = 'An unexpected network error occurred. Please check connectivity.';
    if (data?.detail) {
      message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } else if (data?.message) {
      message = data.message;
    } else if (error.message) {
      message = error.message;
    }

    if (status === 401) {
      await secureStorage.clearAllSession();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    const normalizedError: ApiError = {
      status,
      message,
      code: data?.error?.code || data?.code,
      details: data?.details,
    };

    return Promise.reject(normalizedError);
  }
);

export default apiClient;
