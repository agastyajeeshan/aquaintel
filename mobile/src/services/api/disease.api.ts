import apiClient from './client';
import { DiseaseRiskAssessment } from '../../types';

export const diseaseApi = {
  async getRisks(pondId?: number): Promise<Array<{
    pond_id: number;
    pond_number: number;
    pond_name: string;
    current_status: string;
    doc: number;
    live_metrics: Record<string, number>;
    predictions: DiseaseRiskAssessment[];
    disclaimer: string;
  }>> {
    const response = await apiClient.get('/disease/risks', {
      params: pondId ? { pond_id: pondId } : {},
    });
    return response.data;
  },

  async evaluateCustomRisk(params: {
    disease_key?: string;
    do_mg_l: number;
    temp_c: number;
    ph: number;
    ammonia_mg_l: number;
    salinity_ppt: number;
    doc?: number;
    feeding_reduction_pct?: number;
  }): Promise<DiseaseRiskAssessment> {
    const response = await apiClient.post<DiseaseRiskAssessment>('/disease/evaluate', null, {
      params,
    });
    return response.data;
  },

  async analyzeCheckTray(formData: FormData): Promise<any> {
    const response = await apiClient.post('/cv/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
