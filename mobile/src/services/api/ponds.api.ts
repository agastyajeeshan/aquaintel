import apiClient from './client';
import { PondSummary, PondSensorItem, DataProvenance } from '../../types';

export interface PondDetailResponse {
  overview: {
    id: number;
    pond_number: number;
    name: string;
    area_ha: number;
    water_volume_m3: number;
    shrimp_species: string;
    stocking_date: string;
    current_age_days: number;
    estimated_biomass_kg: number;
    survival_rate_pct: number;
    target_fcr: number;
    status: string;
    active_event?: string;
    provenance?: DataProvenance;
    is_stale?: boolean;
    last_updated?: string;
  };
  live_metrics: Record<string, { value: number; unit: string; status: string; calculated?: boolean }>;
  sensors?: PondSensorItem[];
  chart_series: Array<{
    timestamp: string;
    do?: number;
    ph?: number;
    temperature?: number;
    salinity?: number;
    ammonia?: number;
    turbidity?: number;
  }>;
  time_range: string;
  aerators: any[];
  feeder: any;
  feeding_history?: any[];
  aeration_events?: any[];
  disease_predictions: any[];
  alerts: any[];
}

export const pondsApi = {
  async getPonds(includeArchived: boolean = false): Promise<PondSummary[]> {
    const response = await apiClient.get<PondSummary[]>('/ponds', {
      params: { include_archived: includeArchived },
    });
    return response.data;
  },

  async getPondDetail(pondId: number, timeRange: '6h' | '24h' | '7d' | '30d' = '24h'): Promise<PondDetailResponse> {
    const response = await apiClient.get<PondDetailResponse>(`/ponds/${pondId}`, {
      params: { time_range: timeRange },
    });
    return response.data;
  },

  async createPond(params: {
    pond_number: number;
    name: string;
    area_ha?: number;
    water_volume_m3?: number;
    shrimp_species?: string;
    current_age_days?: number;
    estimated_biomass_kg?: number;
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.post('/ponds', params);
    return response.data;
  },

  async updatePond(pondId: number, params: Partial<PondSummary>): Promise<any> {
    const response = await apiClient.patch(`/ponds/${pondId}`, params);
    return response.data;
  },
};
