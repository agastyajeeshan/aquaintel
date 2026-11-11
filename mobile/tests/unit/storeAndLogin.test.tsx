import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { z } from 'zod';
import { useFarmStore } from '../../src/store/farmStore';
import { useAuthStore } from '../../src/store/authStore';
import { zodResolver } from '../../src/utils/zodResolver';
import LoginScreen from '../../app/(auth)/login';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    back: jest.fn(),
  }),
}));

describe('Store Snapshot, ZodResolver, and Login Screen Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('farmStore snapshot and DEMO provenance handling', () => {
    test('calculateProvenance returns DEMO when overview reports simulated data', () => {
      useFarmStore.setState({
        overview: {
          farm_id: 1,
          farm_name: 'Delta Farm',
          location: 'Coastal Zone A',
          total_area_ha: 6.0,
          total_ponds: 4,
          healthy_ponds: 4,
          warning_ponds: 0,
          critical_ponds: 0,
          total_biomass_kg: 4500,
          today_feed_kg: 120,
          energy_consumption_kwh: 45,
          energy_cost_inr: 315,
          active_alerts_count: 0,
          devices_online_ratio: '4/4',
          is_simulated: true,
          data_provenance: 'DEMO',
          connectivity: {
            internet: 'ONLINE',
            lora_gateway: 'ONLINE',
            sync_queue_records: 0,
            data_sync: 'ACTIVE',
          },
        },
        isOnline: true,
        lastUpdated: new Date().toISOString(),
      });

      expect(useFarmStore.getState().calculateProvenance()).toBe('DEMO');
    });

    test('updateFleetFromSnapshot updates pond metrics and maps simulated/stale/offline provenance', () => {
      useFarmStore.setState({
        overview: null,
        ponds: [
          {
            id: 1,
            pond_number: 1,
            name: 'Pond 1',
            area_ha: 1.5,
            water_volume_m3: 21000,
            shrimp_species: 'Penaeus vannamei',
            current_age_days: 45,
            estimated_biomass_kg: 1125,
            survival_rate_pct: 91,
            target_fcr: 1.35,
            status: 'GREEN',
            water_quality: {
              do: 6.0,
              ph: 8.0,
              temperature: 28.5,
              ammonia: 0.02,
              salinity: 18,
              turbidity: 35,
            },
            aerator_summary: {
              active_count: 1,
              total_count: 2,
              status: 'NORMAL',
            },
            feeding_summary: {
              status: 'NORMAL',
              dispensed_today_kg: 24,
              daily_quota_kg: 48,
              next_feeding_time: '14:00',
            },
            disease_risk: 'LOW',
            disease_risk_score: 12,
          },
        ],
        lastUpdated: null,
        operatingMode: 'CACHED',
      });

      useFarmStore.getState().updateFleetFromSnapshot([
        {
          pond_id: 1,
          data_provenance: 'SYNTHETIC_SIMULATED',
          is_stale: false,
          timestamp: '2026-11-11T08:00:00Z',
          metrics: {
            do: { value: 5.4 },
            ph: { value: 7.7 },
            temperature: { value: 29.1 },
            ammonia: { value: 0.04 },
            salinity: { value: 19 },
            turbidity: { value: 42 },
            water_level: { value: 1.35 },
          },
        },
      ]);

      const pondAfterDemo = useFarmStore.getState().ponds[0];
      expect(pondAfterDemo.water_quality.do).toBe(5.4);
      expect(pondAfterDemo.water_quality.water_depth_m).toBe(1.35);
      expect(pondAfterDemo.water_quality.provenance).toBe('DEMO');
      expect(useFarmStore.getState().operatingMode).toBe('DEMO');

      useFarmStore.getState().updateFleetFromSnapshot(
        [
          {
            pond_id: 1,
            is_stale: true,
            metrics: { do: { value: 4.9 } },
          },
        ],
        false
      );
      expect(useFarmStore.getState().ponds[0].water_quality.provenance).toBe('STALE');
      expect(useFarmStore.getState().ponds[0].water_quality.stale).toBe(true);

      useFarmStore.getState().updateFleetFromSnapshot(
        [
          {
            pond_id: 1,
            is_stale: false,
            metrics: { do: { value: 4.8 } },
          },
        ],
        true
      );
      expect(useFarmStore.getState().ponds[0].water_quality.provenance).toBe('OFFLINE');
      expect(useFarmStore.getState().operatingMode).toBe('OFFLINE');
    });
  });

  describe('zodResolver utility', () => {
    test('returns parsed values on valid input and keyed errors on invalid input', async () => {
      const schema = z.object({
        username: z.string().trim().min(1, 'Username is required'),
      });
      const resolver = zodResolver<{ username: string }>(schema);

      const invalid = await resolver({ username: '   ' }, undefined, {} as any);
      expect(invalid.errors.username?.message).toBe('Username is required');

      const valid = await resolver({ username: '  agastya  ' }, undefined, {} as any);
      expect(valid.errors).toEqual({});
      expect(valid.values).toEqual({ username: 'agastya' });
    });
  });

  describe('LoginScreen validation and credential safety', () => {
    test('does not expose hardcoded demo credentials and validates empty inputs', async () => {
      const mockLogin = jest.fn(async () => true);
      useAuthStore.setState({
        login: mockLogin,
        clearError: jest.fn(),
        isLoading: false,
        error: null,
      } as any);

      const { getByText, queryByText, getByLabelText } = render(<LoginScreen />);

      expect(queryByText(/operator123/i)).toBeNull();
      expect(queryByText(/admin123/i)).toBeNull();
      expect(queryByText(/Quick Demo/i)).toBeNull();
      expect(queryByText(/Nellore/i)).toBeNull();

      fireEvent.press(getByText('Sign In to Farm Console'));

      await waitFor(() => {
        expect(getByText('Username is required')).toBeTruthy();
        expect(getByText('Password is required')).toBeTruthy();
      });
      expect(mockLogin).not.toHaveBeenCalled();

      fireEvent.changeText(getByLabelText('Username'), 'field_op');
      fireEvent.changeText(getByLabelText('Password'), 'secret_pass');
      fireEvent.press(getByText('Sign In to Farm Console'));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('field_op', 'secret_pass');
      });
    });
  });
});
