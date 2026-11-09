import apiClient from './client';
import { AeratorItem } from '../../types';

export interface AerationStatusResponse {
  summary: {
    total_aerators: number;
    active_aerators: number;
    standby_aerators: number;
    total_kwh_today: number;
    total_cost_inr: number;
    hysteresis_window_minutes: number;
  };
  aerators: AeratorItem[];
  recent_events: Array<{
    id: number;
    pond_id: number;
    aerator_id: number;
    action: string;
    trigger_reason: string;
    trigger_do_level: number;
    timestamp: string;
  }>;
}

export const aerationApi = {
  async getStatus(): Promise<AerationStatusResponse> {
    const response = await apiClient.get<AerationStatusResponse>('/aeration/status');
    return response.data;
  },

  async controlAerator(
    aeratorId: number,
    action: 'START' | 'STOP' | 'AUTO' | 'EMERGENCY_OVERRIDE'
  ): Promise<any> {
    const response = await apiClient.post(`/aeration/${aeratorId}/control`, { action });
    return response.data;
  },
};
