import { create } from 'zustand';

interface SettingsState {
  temperatureUnit: 'C' | 'F';
  doUnit: 'mg/L' | 'ppm';
  depthUnit: 'm' | 'ft';
  offlineSyncEnabled: boolean;
  pushNotificationsEnabled: boolean;
  soundAlertsEnabled: boolean;
  selectedLanguage: 'en';

  setTemperatureUnit: (unit: 'C' | 'F') => void;
  setDoUnit: (unit: 'mg/L' | 'ppm') => void;
  setOfflineSync: (enabled: boolean) => void;
  setPushNotifications: (enabled: boolean) => void;
  setSoundAlerts: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  temperatureUnit: 'C',
  doUnit: 'mg/L',
  depthUnit: 'm',
  offlineSyncEnabled: true,
  pushNotificationsEnabled: true,
  soundAlertsEnabled: true,
  selectedLanguage: 'en',

  setTemperatureUnit: (temperatureUnit) => set({ temperatureUnit }),
  setDoUnit: (doUnit) => set({ doUnit }),
  setOfflineSync: (offlineSyncEnabled) => set({ offlineSyncEnabled }),
  setPushNotifications: (pushNotificationsEnabled) => set({ pushNotificationsEnabled }),
  setSoundAlerts: (soundAlertsEnabled) => set({ soundAlertsEnabled }),
}));
