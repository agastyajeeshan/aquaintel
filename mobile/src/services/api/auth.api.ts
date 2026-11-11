import apiClient from './client';
import { AuthTokenResponse, UserProfile } from '../../types';

export const authApi = {
  async login(username: string, password: string): Promise<AuthTokenResponse> {
    const response = await apiClient.post<AuthTokenResponse>('/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  async register(params: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    role?: string;
  }): Promise<AuthTokenResponse> {
    const response = await apiClient.post<AuthTokenResponse>('/auth/register', params);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Proceed even if network request fails
    }
  },

  async getMe(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/auth/me');
    return response.data;
  },

  async requestPasswordReset(email: string): Promise<{ status: string; message: string; debug_token?: string }> {
    const response = await apiClient.post('/auth/password-reset/request', { email });
    return response.data;
  },

  async confirmPasswordReset(token: string, new_password: string): Promise<{ status: string; message: string }> {
    const response = await apiClient.post('/auth/password-reset/confirm', {
      token,
      new_password,
    });
    return response.data;
  },
};
