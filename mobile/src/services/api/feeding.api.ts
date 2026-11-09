import apiClient from './client';
import { FeederItem } from '../../types';

export interface FeedingStatusResponse {
  summary: {
    today_feed_kg: number;
    recommended_feed_kg: number;
    feed_consumed_kg: number;
    feed_remaining_kg: number;
    fcr: number;
    feeding_efficiency_pct: number;
  };
  feeders: FeederItem[];
  recent_logs: Array<{
    id: number;
    pond_id: number;
    feeder_id: number;
    amount_kg: number;
    planned_amount_kg: number;
    reduction_reason?: string;
    do_at_feeding: number;
    temp_at_feeding: number;
    status: string;
    timestamp: string;
  }>;
}

export const feedingApi = {
  async getStatus(): Promise<FeedingStatusResponse> {
    const response = await apiClient.get<FeedingStatusResponse>('/feeding/status');
    return response.data;
  },

  async controlFeeder(feederId: number, params: { action: string; amount_kg?: number }): Promise<any> {
    const response = await apiClient.post(`/feeding/${feederId}/control`, params);
    return response.data;
  },

  async calculateRecommendation(params: {
    biomass_kg: number;
    doc: number;
    temp_c: number;
    do_mg_l: number;
    ammonia_mg_l?: number;
    uneaten_feed?: boolean;
  }): Promise<{
    recommended_feed_kg: number;
    reduction_percentage: number;
    status: string;
    reasons: string[];
    suggested_meals: number;
  }> {
    const response = await apiClient.post('/feeding/calculate', null, { params });
    return response.data;
  },
};
