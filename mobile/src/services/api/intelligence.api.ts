import apiClient from './client';
import { AIModelStatus, MultiHorizonForecast } from '../../types';

export const intelligenceApi = {
  async getModelsStatus(): Promise<AIModelStatus> {
    const response = await apiClient.get<AIModelStatus>('/ai/models/status');
    return response.data;
  },

  async getDataQualityReport(): Promise<any> {
    const response = await apiClient.get('/ai/data/quality-report');
    return response.data;
  },

  async getPondForecast(pondId: number): Promise<MultiHorizonForecast> {
    const response = await apiClient.get<MultiHorizonForecast>(`/climate/ponds/${pondId}/forecast`);
    return response.data;
  },

  async getModelBenchmarks(): Promise<any> {
    const response = await apiClient.get('/climate/models/performance');
    return response.data;
  },

  async getFleetClimateAnalysis(): Promise<any> {
    const response = await apiClient.get('/climate/analysis');
    return response.data;
  },
};
