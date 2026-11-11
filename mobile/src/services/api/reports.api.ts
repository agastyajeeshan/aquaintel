import apiClient from './client';
import { DailyReportSummary } from '../../types';
import { ENV } from '../../constants';

export const reportsApi = {
  async getDailyReport(): Promise<DailyReportSummary> {
    const response = await apiClient.get<DailyReportSummary>('/reports/daily');
    return response.data;
  },

  async downloadCsvReport(): Promise<string> {
    const response = await apiClient.get<string>('/reports/export-csv', {
      responseType: 'text',
    });
    return response.data;
  },

  getCsvExportUrl(): string {
    return `${ENV.API_BASE_URL}/reports/export-csv`;
  },
};
