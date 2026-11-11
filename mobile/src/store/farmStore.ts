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
  updateFleetFromSnapshot: (pondsSnapshot: any[], isBackendOffline?: boolean) => void;
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
    const { isOnline, lastUpdated, overview } = get();
    if (!isOnline) return 'OFFLINE';
    if (!lastUpdated) return 'CACHED';
    const ageMs = Date.now() - new Date(lastUpdated).getTime();
    if (ageMs > FRESHNESS_THRESHOLD_MS) return 'STALE';
    if (overview?.is_simulated || overview?.data_provenance === 'DEMO' || overview?.data_provenance === 'SIMULATED') {
      return 'DEMO';
    }
    return 'LIVE';
  },

  fetchFarmData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [overviewData, pondsData] = await Promise.all([
        farmsApi.getOverview(),
        pondsApi.getPonds(),
      ]);

      const now = overviewData.timestamp || new Date().toISOString();
      const provenance: DataProvenance =
        overviewData.is_simulated || overviewData.data_provenance === 'DEMO'
          ? 'DEMO'
          : 'LIVE';

      set({
        overview: overviewData,
        ponds: pondsData,
        lastUpdated: now,
        operatingMode: provenance,
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
      operatingMode:
        state.overview?.is_simulated || metrics.provenance === 'DEMO' || metrics.provenance === 'SIMULATED'
          ? 'DEMO'
          : 'LIVE',
    }));
  },

  updateFleetFromSnapshot: (pondsSnapshot: any[], isBackendOffline?: boolean) => {
    if (!Array.isArray(pondsSnapshot) || pondsSnapshot.length === 0) return;
    const snapshotById = new Map<number, any>();
    for (const snap of pondsSnapshot) {
      if (snap?.pond_id) snapshotById.set(snap.pond_id, snap);
    }
    const now = new Date().toISOString();
    const firstSnap = pondsSnapshot[0];
    const isSimulated = firstSnap?.data_provenance === 'SYNTHETIC_SIMULATED';

    set((state) => ({
      ponds: state.ponds.map((p) => {
        const snap = snapshotById.get(p.id);
        if (!snap?.metrics) return p;
        const m = snap.metrics;
        const isStale = Boolean(snap.is_stale);
        const provenance: DataProvenance = isBackendOffline
          ? 'OFFLINE'
          : isStale
          ? 'STALE'
          : isSimulated
          ? 'DEMO'
          : 'LIVE';
        return {
          ...p,
          status: snap.status || p.status,
          active_event: snap.active_event ?? p.active_event,
          provenance,
          water_quality: {
            ...p.water_quality,
            do: m.do?.value ?? p.water_quality.do,
            ph: m.ph?.value ?? p.water_quality.ph,
            temperature: m.temperature?.value ?? p.water_quality.temperature,
            ammonia: m.ammonia?.value ?? p.water_quality.ammonia,
            salinity: m.salinity?.value ?? p.water_quality.salinity,
            turbidity: m.turbidity?.value ?? p.water_quality.turbidity,
            water_depth_m: m.water_level?.value ?? p.water_quality.water_depth_m,
            last_updated: snap.timestamp || now,
            stale: isStale,
            provenance,
          },
        };
      }),
      lastUpdated: now,
      operatingMode: isBackendOffline ? 'OFFLINE' : isSimulated ? 'DEMO' : 'LIVE',
    }));
  },

  setSelectedPondId: (id: number | null) => set({ selectedPondId: id }),
  setOnlineStatus: (online: boolean) => {
    set((state) => ({
      isOnline: online,
      operatingMode: !online
        ? 'OFFLINE'
        : state.overview?.is_simulated
        ? 'DEMO'
        : state.lastUpdated
        ? 'LIVE'
        : 'CACHED',
    }));
  },
}));
