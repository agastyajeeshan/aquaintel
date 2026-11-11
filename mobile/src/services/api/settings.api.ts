import apiClient from './client';

export const settingsApi = {
  async getSettings(): Promise<any> {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  async updateSettings(settingsData: any): Promise<any> {
    const response = await apiClient.put('/settings', settingsData);
    return response.data;
  },

  async getUsers(): Promise<any[]> {
    const response = await apiClient.get('/settings/users');
    return response.data;
  },

  async getAuditLogs(): Promise<any[]> {
    const response = await apiClient.get('/settings/audit-logs');
    return response.data;
  },

  async resetDemo(): Promise<any> {
    const response = await apiClient.post('/settings/reset-demo');
    return response.data;
  },
};
