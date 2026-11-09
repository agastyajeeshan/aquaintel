import { useFarmStore } from '../../src/store/farmStore';
import { farmsApi } from '../../src/services/api/farms.api';
import { pondsApi } from '../../src/services/api/ponds.api';

jest.mock('../../src/services/api/farms.api');
jest.mock('../../src/services/api/ponds.api');

describe('Farm Store & Provenance State Machine Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFarmStore.setState({
      overview: null,
      ponds: [],
      selectedPondId: null,
      operatingMode: 'CACHED',
      isOnline: true,
      isLoading: false,
      lastUpdated: null,
      error: null,
    });
  });

  test('calculateProvenance returns OFFLINE when network connection is severed', () => {
    useFarmStore.getState().setOnlineStatus(false);
    expect(useFarmStore.getState().calculateProvenance()).toBe('OFFLINE');
  });

  test('calculateProvenance returns LIVE when online and fresh timestamp is present', () => {
    useFarmStore.setState({
      isOnline: true,
      lastUpdated: new Date().toISOString(),
    });
    expect(useFarmStore.getState().calculateProvenance()).toBe('LIVE');
  });

  test('calculateProvenance returns STALE when lastUpdated exceeds 60 seconds', () => {
    const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
    useFarmStore.setState({
      isOnline: true,
      lastUpdated: twoMinutesAgo,
    });
    expect(useFarmStore.getState().calculateProvenance()).toBe('STALE');
  });

  test('updatePondLiveMetrics merges real-time telemetry into pond state', () => {
    const initialPond = {
      id: 4,
      pond_number: 4,
      name: 'Pond 04',
      area_ha: 1.0,
      water_volume_m3: 12000,
      shrimp_species: 'Litopenaeus vannamei',
      current_age_days: 45,
      estimated_biomass_kg: 1250,
      survival_rate_pct: 88,
      target_fcr: 1.25,
      status: 'GREEN' as const,
      water_quality: {
        do: 6.1,
        ph: 8.0,
        temperature: 29.0,
        ammonia: 0.03,
        salinity: 20.0,
        turbidity: 35.0,
      },
      aerator_summary: { active_count: 2, total_count: 4, status: 'NORMAL' as const },
      feeding_summary: { status: 'NORMAL' as const, dispensed_today_kg: 30, daily_quota_kg: 45, next_feeding_time: '17:00 IST' },
      disease_risk: 'LOW' as const,
      disease_risk_score: 12,
    };

    useFarmStore.setState({ ponds: [initialPond] });

    useFarmStore.getState().updatePondLiveMetrics(4, {
      do: 6.45,
      ph: 7.95,
      temperature: 29.3,
      ammonia: 0.02,
      salinity: 20.2,
      turbidity: 36.0,
    });

    const updatedPond = useFarmStore.getState().ponds.find((p) => p.id === 4);
    expect(updatedPond?.water_quality.do).toBe(6.45);
    expect(updatedPond?.water_quality.ph).toBe(7.95);
    expect(updatedPond?.water_quality.stale).toBe(false);
    expect(useFarmStore.getState().operatingMode).toBe('LIVE');
  });
});
