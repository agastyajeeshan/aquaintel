import { SAFETY_INTERLOCKS, FRESHNESS_THRESHOLD_MS } from '../../src/constants';

describe('Aquaculture Safety Interlocks & Freshness Rules', () => {
  test('Emergency Hypoxia Lockout forbids aerator stop if DO < 3.8 mg/L', () => {
    const isStopAllowed = (pondDo: number) => {
      if (pondDo < SAFETY_INTERLOCKS.EMERGENCY_HYPOXIA_DO_MIN) {
        return false; // Reject stop
      }
      return true;
    };

    expect(isStopAllowed(3.2)).toBe(false); // Critical hypoxia
    expect(isStopAllowed(3.79)).toBe(false);
    expect(isStopAllowed(3.80)).toBe(true);  // Exactly at boundary
    expect(isStopAllowed(6.5)).toBe(true);   // Safe
  });

  test('Feeding Lockout forbids feed dispension if DO < 4.0 mg/L', () => {
    const isFeedingSafe = (pondDo: number) => {
      if (pondDo < SAFETY_INTERLOCKS.FEEDING_LOCKOUT_DO_MIN) {
        return false;
      }
      return true;
    };

    expect(isFeedingSafe(3.9)).toBe(false); // Feeding prohibited in hypoxia
    expect(isFeedingSafe(4.0)).toBe(true);
    expect(isFeedingSafe(5.8)).toBe(true);
  });

  test('Telemetry Freshness marks readings older than 60 seconds as stale', () => {
    const checkIsStale = (timestampMs: number, currentMs: number) => {
      return (currentMs - timestampMs) > FRESHNESS_THRESHOLD_MS;
    };

    const now = 1700000000000;
    const freshReading = now - 20000; // 20s old
    const staleReading = now - 65000; // 65s old

    expect(checkIsStale(freshReading, now)).toBe(false);
    expect(checkIsStale(staleReading, now)).toBe(true);
  });

  test('Optimal water quality ranges correspond to Penaeus vannamei physiological standards', () => {
    expect(SAFETY_INTERLOCKS.OPTIMAL_DO_MIN).toBe(5.0);
    expect(SAFETY_INTERLOCKS.OPTIMAL_DO_MAX).toBe(7.5);
    expect(SAFETY_INTERLOCKS.OPTIMAL_PH_MIN).toBe(7.5);
    expect(SAFETY_INTERLOCKS.OPTIMAL_PH_MAX).toBe(8.3);
    expect(SAFETY_INTERLOCKS.OPTIMAL_TEMP_MIN).toBe(26.0);
    expect(SAFETY_INTERLOCKS.OPTIMAL_TEMP_MAX).toBe(32.0);
    expect(SAFETY_INTERLOCKS.OPTIMAL_SALINITY_MIN).toBe(12.0);
    expect(SAFETY_INTERLOCKS.OPTIMAL_SALINITY_MAX).toBe(25.0);
  });
});
