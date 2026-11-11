import apiClient from './client';
import { FarmOverview } from '../../types';

export const farmsApi = {
  async getOverview(): Promise<FarmOverview> {
    const response = await apiClient.get<FarmOverview>('/farms/overview');
    return response.data;
  },
};
