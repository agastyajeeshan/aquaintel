import apiClient from './client';
import { AlertItem } from '../../types';

export const alertsApi = {
  async getAlerts(params?: {
    status?: string;
    severity?: string;
    pond_id?: number;
    limit?: number;
  }): Promise<AlertItem[]> {
    const response = await apiClient.get<AlertItem[]>('/alerts', { params });
    return response.data;
  },

  async acknowledgeAlert(alertId: number, userName?: string): Promise<any> {
    const response = await apiClient.post(`/alerts/${alertId}/acknowledge`, null, {
      params: userName ? { user_name: userName } : {},
    });
    return response.data;
  },

  async resolveAlert(alertId: number, userName?: string): Promise<any> {
    const response = await apiClient.post(`/alerts/${alertId}/resolve`, null, {
      params: userName ? { user_name: userName } : {},
    });
    return response.data;
  },

  async ignoreAlert(alertId: number): Promise<any> {
    const response = await apiClient.post(`/alerts/${alertId}/ignore`);
    return response.data;
  },

  async registerPushToken(token: string, platform: string = 'android', deviceId?: string): Promise<any> {
    const response = await apiClient.post('/alerts/push-token', {
      token,
      platform,
      device_id: deviceId,
    });
    return response.data;
  },

  async unregisterPushToken(token: string): Promise<any> {
    const response = await apiClient.delete('/alerts/push-token', {
      data: { token },
    });
    return response.data;
  },
};
