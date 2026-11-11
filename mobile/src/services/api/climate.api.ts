import apiClient from './client';
import { WeatherObservation, MultiHorizonForecast } from '../../types';

export const climateApi = {
  async getCurrentWeather(): Promise<{
    status: string;
    weather: WeatherObservation;
    location_name?: string;
    provider: string;
    is_simulated: boolean;
    data_freshness_seconds: number;
  }> {
    const response = await apiClient.get('/climate/weather/current');
    return response.data;
  },

  async getFleetAnalysis(): Promise<any> {
    const response = await apiClient.get('/climate/analysis');
    return response.data;
  },

  async getModelPerformance(): Promise<any> {
    const response = await apiClient.get('/climate/models/performance');
    return response.data;
  },

  async getWeatherForecast(horizonsHours: number = 72): Promise<any> {
    const response = await apiClient.get('/climate/weather/forecast', {
      params: { horizons_hours: horizonsHours },
    });
    return response.data;
  },

  async getPondForecast(pondId: number): Promise<MultiHorizonForecast> {
    const response = await apiClient.get<MultiHorizonForecast>(`/climate/ponds/${pondId}/forecast`);
    return response.data;
  },

  async getPondClimateAnalysis(pondId: number): Promise<any> {
    const response = await apiClient.get(`/climate/ponds/${pondId}/analysis`);
    return response.data;
  },

  async getPondRecommendations(pondId: number): Promise<any> {
    const response = await apiClient.get(`/climate/ponds/${pondId}/recommendations`);
    return response.data;
  },

  async approveRecommendation(pondId: number, actionType: 'AERATION' | 'FEEDING', notes?: string): Promise<any> {
    const response = await apiClient.post(`/climate/ponds/${pondId}/approve`, {
      action_type: actionType,
      notes,
    });
    return response.data;
  },
};
