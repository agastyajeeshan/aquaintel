import apiClient from './client';
import { IoTDeviceItem } from '../../types';

export const devicesApi = {
  async getDevices(): Promise<{
    summary: {
      total_devices: number;
      online_devices: number;
      offline_devices: number;
      gateway_status: string;
      lora_channel: string;
      average_rssi_dbm: number;
      sync_records_waiting: number;
    };
    devices: IoTDeviceItem[];
  }> {
    const response = await apiClient.get('/devices');
    return response.data;
  },

  async getDevice(deviceId: string): Promise<IoTDeviceItem> {
    const response = await apiClient.get<IoTDeviceItem>(`/devices/${deviceId}`);
    return response.data;
  },

  async issueCommand(
    deviceId: string,
    params: {
      action: string;
      reason?: string;
      mode?: string;
      parameters?: Record<string, any>;
      expires_in_seconds?: number;
    }
  ): Promise<any> {
    const response = await apiClient.post(`/devices/${deviceId}/commands`, params);
    return response.data;
  },
};
