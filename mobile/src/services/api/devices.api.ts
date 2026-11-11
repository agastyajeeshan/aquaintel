import apiClient from './client';
import { IoTDeviceItem, DeviceCommandItem } from '../../types';

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

  async getCommands(deviceId: string, limit: number = 20): Promise<DeviceCommandItem[]> {
    const response = await apiClient.get<DeviceCommandItem[]>(`/devices/${deviceId}/commands`, {
      params: { limit },
    });
    return response.data;
  },

  async issueCommand(
    deviceId: string,
    params: {
      device_id?: string;
      action: string;
      target_state?: string;
      reason?: string;
      mode?: string;
      expires_in_seconds?: number;
    }
  ): Promise<any> {
    const response = await apiClient.post(`/devices/${deviceId}/commands`, {
      schema_version: '1.0',
      device_id: params.device_id || deviceId,
      ...params,
    });
    return response.data;
  },
};
