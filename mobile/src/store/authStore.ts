import { create } from 'zustand';
import { UserProfile, UserRole } from '../types';
import { authApi } from '../services/api/auth.api';
import { secureStorage } from '../services/storage/secureStore';
import { setOnUnauthorizedCallback } from '../services/api/client';
import { notificationService } from '../services/notifications/notificationService';
import { offlineDatabase } from '../services/storage/database';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: UserProfile) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(username, password);
      await secureStorage.setAccessToken(response.access_token);
      
      let userProfile: UserProfile;
      try {
        userProfile = await authApi.getMe();
      } catch {
        const role = response.role as UserRole;
        userProfile = {
          id: 0,
          username: response.username,
          full_name: response.full_name,
          role: role,
          email: '',
        };
      }

      set({
        token: response.access_token,
        role: userProfile.role,
        user: userProfile,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Login failed. Please check your credentials.',
        isAuthenticated: false,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await notificationService.unregisterPushTokenAsync();
    } catch (e) {
      // Ignore notification unregister errors
    }
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network errors during logout
    }
    await secureStorage.clearAllSession();
    await offlineDatabase.clearAllCache();
    set({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      error: null,
    });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await secureStorage.getAccessToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const me = await authApi.getMe();
      set({
        token,
        user: me,
        role: me.role,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (e) {
      await secureStorage.clearAllSession();
      set({
        token: null,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user: UserProfile) => set({ user, role: user.role }),
  clearError: () => set({ error: null }),
}));

// Wire un-authorized handler
setOnUnauthorizedCallback(() => {
  useAuthStore.getState().logout();
});
