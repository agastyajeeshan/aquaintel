import { Platform } from 'react-native';

// Resolve host: Android emulator uses 10.0.2.2, iOS / Web uses localhost
const getLocalHost = () => {
  if (Platform.OS === 'android') {
    return '10.0.2.2:8000';
  }
  return 'localhost:8000';
};

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || `http://${getLocalHost()}/api`,
  WS_BASE_URL: process.env.EXPO_PUBLIC_WS_URL || `ws://${getLocalHost()}/ws/telemetry`,
  DEMO_MODE: process.env.EXPO_PUBLIC_DEMO_MODE === 'true',
  REQUEST_TIMEOUT_MS: 15000,
  DEFAULT_FARM_ID: 1,
  DEFAULT_LATITUDE: 14.4426,
  DEFAULT_LONGITUDE: 79.9865,
};

// Telemetry Freshness Thresholds
export const FRESHNESS_THRESHOLD_MS = 60 * 1000; // 60 seconds
export const STALE_WARNING_MS = 120 * 1000; // 2 minutes

// Strict Edge Safety Interlocks
export const SAFETY_INTERLOCKS = {
  EMERGENCY_HYPOXIA_DO_MIN: 3.8, // mg/L — Aerators cannot be turned OFF below this!
  FEEDING_LOCKOUT_DO_MIN: 4.0,   // mg/L — Feeders cannot dispense below this!
  CRITICAL_HIGH_TEMP_C: 34.0,    // °C — Feeding reduced 50%
  CRITICAL_LOW_TEMP_C: 24.0,     // °C — Feeding reduced 50%
  CRITICAL_HIGH_AMMONIA: 0.10,   // mg/L TAN — Feeding reduced
  OPTIMAL_PH_MIN: 7.5,
  OPTIMAL_PH_MAX: 8.3,
  OPTIMAL_DO_MIN: 5.0,
  OPTIMAL_DO_MAX: 7.5,
  OPTIMAL_SALINITY_MIN: 12.0,
  OPTIMAL_SALINITY_MAX: 25.0,
  OPTIMAL_TEMP_MIN: 26.0,
  OPTIMAL_TEMP_MAX: 32.0,
};

export interface WaterQualityConfig {
  unit: string;
  name: string;
  optimalMin: number;
  optimalMax: number;
  criticalMin?: number;
  criticalMax?: number;
  decimals: number;
}

export const WATER_QUALITY_LIMITS: Record<string, WaterQualityConfig> = {
  do: {
    unit: 'mg/L',
    name: 'Dissolved Oxygen',
    optimalMin: SAFETY_INTERLOCKS.OPTIMAL_DO_MIN,
    optimalMax: SAFETY_INTERLOCKS.OPTIMAL_DO_MAX,
    criticalMin: SAFETY_INTERLOCKS.EMERGENCY_HYPOXIA_DO_MIN,
    decimals: 2,
  },
  ph: {
    unit: 'pH',
    name: 'Acidity / pH',
    optimalMin: SAFETY_INTERLOCKS.OPTIMAL_PH_MIN,
    optimalMax: SAFETY_INTERLOCKS.OPTIMAL_PH_MAX,
    criticalMin: 7.0,
    criticalMax: 8.8,
    decimals: 2,
  },
  temperature: {
    unit: '°C',
    name: 'Water Temperature',
    optimalMin: SAFETY_INTERLOCKS.OPTIMAL_TEMP_MIN,
    optimalMax: SAFETY_INTERLOCKS.OPTIMAL_TEMP_MAX,
    criticalMin: SAFETY_INTERLOCKS.CRITICAL_LOW_TEMP_C,
    criticalMax: SAFETY_INTERLOCKS.CRITICAL_HIGH_TEMP_C,
    decimals: 1,
  },
  salinity: {
    unit: 'ppt',
    name: 'Salinity',
    optimalMin: SAFETY_INTERLOCKS.OPTIMAL_SALINITY_MIN,
    optimalMax: SAFETY_INTERLOCKS.OPTIMAL_SALINITY_MAX,
    criticalMin: 5.0,
    criticalMax: 35.0,
    decimals: 1,
  },
  ammonia: {
    unit: 'mg/L',
    name: 'Ammonia (TAN)',
    optimalMin: 0.0,
    optimalMax: 0.05,
    criticalMax: 0.10,
    decimals: 3,
  },
  turbidity: {
    unit: 'cm',
    name: 'Secchi Turbidity',
    optimalMin: 30.0,
    optimalMax: 45.0,
    criticalMin: 20.0,
    decimals: 1,
  },
};
