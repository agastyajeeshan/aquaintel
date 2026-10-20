const API_BASE = "http://localhost:8000/api";

export async function fetchJson(endpoint: string, options: RequestInit = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`Fetch error for ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Farm
  getFarmOverview: () => fetchJson("/farms/overview"),
  
  // Ponds
  getPonds: () => fetchJson("/ponds"),
  getPondDetail: (id: number, timeRange: string = "24h") =>
    fetchJson(`/ponds/${id}?time_range=${timeRange}`),
  
  // Feeding
  getFeedingStatus: () => fetchJson("/feeding/status"),
  calculateFeeding: (params: Record<string, any>) =>
    fetchJson(`/feeding/calculate?${new URLSearchParams(params).toString()}`, { method: "POST" }),
  controlFeeder: (id: number, action: string, amount_kg?: number, schedule_time?: string) =>
    fetchJson(`/feeding/${id}/control`, {
      method: "POST",
      body: JSON.stringify({ action, amount_kg, schedule_time }),
    }),
  
  // Aeration
  getAerationStatus: () => fetchJson("/aeration/status"),
  controlAerator: (id: number, action: string) =>
    fetchJson(`/aeration/${id}/control`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
  
  // Disease
  getDiseaseRisks: (pond_id?: number) =>
    fetchJson(`/disease/risks${pond_id ? `?pond_id=${pond_id}` : ""}`),
  
  // Computer Vision
  getCVSamples: () => fetchJson("/cv/samples"),
  analyzeCV: async (formData?: FormData) => {
    try {
      const res = await fetch(`${API_BASE}/cv/analyze`, {
        method: "POST",
        body: formData || new FormData(),
      });
      return await res.json();
    } catch (e) {
      throw e;
    }
  },

  // Devices
  getDevices: () => fetchJson("/devices"),
  
  // Alerts
  getAlerts: (status?: string, severity?: string) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (severity) params.append("severity", severity);
    return fetchJson(`/alerts?${params.toString()}`);
  },
  acknowledgeAlert: (id: number) => fetchJson(`/alerts/${id}/acknowledge`, { method: "POST" }),
  resolveAlert: (id: number) => fetchJson(`/alerts/${id}/resolve`, { method: "POST" }),
  ignoreAlert: (id: number) => fetchJson(`/alerts/${id}/ignore`, { method: "POST" }),

  // Analytics
  getAnalytics: () => fetchJson("/analytics"),

  // ROI / Commercial
  getROI: () => fetchJson("/roi"),
  calculateROI: (data: any) =>
    fetchJson("/roi/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Reports
  getDailyReport: () => fetchJson("/reports/daily"),
  
  // Settings
  getSettings: () => fetchJson("/settings"),
  updateSettings: (settings: any) =>
    fetchJson("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  getUsers: () => fetchJson("/settings/users"),

  // Simulator
  getSimulatorStatus: () => fetchJson("/simulator/status"),
  injectEvent: (pond_id: number, event_type: string) =>
    fetchJson("/simulator/inject", {
      method: "POST",
      body: JSON.stringify({ pond_id, event_type }),
    }),
  resetSimulatorEvents: () => fetchJson("/simulator/reset", { method: "POST" }),
  toggleOffline: (offline: boolean) =>
    fetchJson("/simulator/offline", {
      method: "POST",
      body: JSON.stringify({ offline }),
    }),
};
