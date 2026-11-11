import apiClient from './client';

export interface SensorReadingItem {
  id: number;
  pond_id: number;
  sensor_type: string;
  value: number;
  unit: string;
  timestamp: string;
  quality_score?: number;
}

export const sensorsApi = {
  async getLatest(): Promise<any[]> {
    const response = await apiClient.get('/sensors/latest');
    return response.data;
  },

  async getReadings(params?: {
    pond_id?: number;
    sensor_type?: string;
    limit?: number;
  }): Promise<SensorReadingItem[]> {
    const response = await apiClient.get('/sensors/readings', { params });
    return response.data;
  },

  async getHealth(): Promise<any> {
    const response = await apiClient.get('/sensors/health');
    return response.data;
  },
};
