import { create } from 'zustand';
import { FarmOverview, PondSummary, DataProvenance, WaterQualityMetrics } from '../types';
import { farmsApi } from '../services/api/farms.api';
import { pondsApi } from '../services/api/ponds.api';
import { offlineDatabase } from '../services/storage/database';
import { FRESHNESS_THRESHOLD_MS } from '../constants';

interface FarmState {
  overview: FarmOverview | null;
  ponds: PondSummary[];
  selectedPondId: number | null;
  operatingMode: DataProvenance;
  isOnline: boolean;
  isLoading: boolean;
  lastUpdated: string | null;
  error: string | null;

  fetchFarmData: () => Promise<void>;
  updatePondLiveMetrics: (pondId: number, metrics: WaterQualityMetrics, timestamp?: string) => void;
  setSelectedPondId: (id: number | null) => void;
  setOnlineStatus: (online: boolean) => void;
  calculateProvenance: () => DataProvenance;
}

export const useFarmStore = create<FarmState>((set, get) => ({
  overview: null,
  ponds: [],
  selectedPondId: null,
  operatingMode: 'CACHED',
  isOnline: true,
  isLoading: false,
  lastUpdated: null,
  error: null,

  calculateProvenance: () => {
    const { isOnline, lastUpdated } = get();
    if (!isOnline) return 'OFFLINE';
    if (!lastUpdated) return 'CACHED';
    const ageMs = Date.now() - new Date(lastUpdated).getTime();
    if (ageMs > FRESHNESS_THRESHOLD_MS) return 'STALE';
    return 'LIVE';
  },

  fetchFarmData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [overviewData, pondsData] = await Promise.all([
        farmsApi.getOverview(),
        pondsApi.getPonds(),
      ]);

      const now = new Date().toISOString();
      set({
        overview: overviewData,
        ponds: pondsData,
        lastUpdated: now,
        operatingMode: 'LIVE',
        isLoading: false,
      });

      // Cache locally in SQLite for offline access
      offlineDatabase.saveFarmOverview(overviewData);
      offlineDatabase.savePonds(pondsData);
    } catch (err: any) {
      // Graceful fallback to offline SQLite cache
      const [cachedOverview, cachedPonds] = await Promise.all([
        offlineDatabase.getCachedFarmOverview(),
        offlineDatabase.getCachedPonds(),
      ]);

      if (cachedOverview || cachedPonds) {
        set({
          overview: cachedOverview?.data || null,
          ponds: cachedPonds?.data || [],
          lastUpdated: cachedOverview?.updatedAt || cachedPonds?.updatedAt || null,
          operatingMode: get().isOnline ? 'CACHED' : 'OFFLINE',
          isLoading: false,
          error: 'Using cached farm data (server unreachable)',
        });
      } else {
        set({
          isLoading: false,
          operatingMode: 'UNAVAILABLE',
          error: err.message || 'Unable to load farm data',
        });
      }
    }
  },

  updatePondLiveMetrics: (pondId: number, metrics: WaterQualityMetrics, timestamp?: string) => {
    const now = timestamp || new Date().toISOString();
    set((state) => ({
      ponds: state.ponds.map((p) =>
        p.id === pondId
          ? {
              ...p,
              water_quality: {
                ...p.water_quality,
                ...metrics,
                last_updated: now,
                stale: false,
              },
            }
          : p
      ),
      lastUpdated: now,
      operatingMode: 'LIVE',
    }));
  },

  setSelectedPondId: (id: number | null) => set({ selectedPondId: id }),
  setOnlineStatus: (online: boolean) => {
    set((state) => ({
      isOnline: online,
      operatingMode: !online ? 'OFFLINE' : state.lastUpdated ? 'LIVE' : 'CACHED',
    }));
  },
}));
