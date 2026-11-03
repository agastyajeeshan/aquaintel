import ENV from "../config/env";

export { ENV };

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public endpoint: string;
  public details?: any;

  constructor(status: number, statusText: string, endpoint: string, details?: any) {
    super(`API Error ${status} (${statusText}) at ${endpoint}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.endpoint = endpoint;
    this.details = details;
  }
}

export async function fetchJson(endpoint: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ENV.timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Inject Bearer token if present
  if (typeof window !== "undefined" && window.localStorage) {
    const token = localStorage.getItem(ENV.authTokenKey);
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const res = await fetch(`${ENV.getApiBaseUrl()}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errDetails = null;
      try {
        errDetails = await res.json();
      } catch {
        // Body was not JSON
      }
      throw new ApiError(res.status, res.statusText, endpoint, errDetails);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new ApiError(408, `Request Timeout (${ENV.timeoutMs}ms)`, endpoint);
    }
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
  
  // AI & Dataset Intelligence
  getAIModelStatus: () => fetchJson("/ai/models/status"),
  getAIDataQualityReport: () => fetchJson("/ai/data/quality-report"),
  validateAIDataset: () => fetchJson("/ai/data/validate", { method: "POST" }),
  evaluateDiseaseRisk: (data: any) =>
    fetchJson("/ai/disease-risk/evaluate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  // Computer Vision
  getCVSamples: () => fetchJson("/cv/samples"),
  analyzeCV: async (formData?: FormData) => {
    try {
      const res = await fetch(`${ENV.getApiBaseUrl()}/cv/analyze`, {
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
  addDevice: (deviceId: string, deviceType: string, pondId?: number) => {
    const params = new URLSearchParams({ device_id: deviceId, device_type: deviceType });
    if (pondId !== undefined && pondId !== null) params.append("pond_id", pondId.toString());
    return fetchJson(`/devices?${params.toString()}`, { method: "POST" });
  },
  
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

  // Dynamic Climate Adaptation & Forecasting
  getWeatherCurrent: () => fetchJson("/climate/weather/current"),
  getWeatherForecast: (horizons: number = 72) => fetchJson(`/climate/weather/forecast?horizons_hours=${horizons}`),
  getClimateFleetAnalysis: () => fetchJson("/climate/analysis"),
  getPondClimateAnalysis: (pondId: number) => fetchJson(`/climate/ponds/${pondId}/analysis`),
  getPondMultiHorizonForecast: (pondId: number) => fetchJson(`/climate/ponds/${pondId}/forecast`),
  getPondClimateRecommendations: (pondId: number) => fetchJson(`/climate/ponds/${pondId}/recommendations`),
  approveClimateRecommendation: (pondId: number, action_type: string, notes?: string) =>
    fetchJson(`/climate/ponds/${pondId}/approve`, {
      method: "POST",
      body: JSON.stringify({ action_type, notes }),
    }),
  getClimateModelPerformance: () => fetchJson("/climate/models/performance"),
  simulateClimateScenario: (scenario: string, custom_parameters?: any) =>
    fetchJson("/climate/simulate", {
      method: "POST",
      body: JSON.stringify({ scenario, custom_parameters }),
    }),

  // Fully Autonomous Intelligent Farm Management Engine
  getAutonomousStatus: () => fetchJson("/autonomous/status"),
  setAutonomousMode: (mode: string, operator_name?: string, reason?: string) =>
    fetchJson("/autonomous/mode", {
      method: "POST",
      body: JSON.stringify({ mode, operator_name, reason }),
    }),
  getAutonomousDecisions: (pond_id?: number, limit: number = 50) =>
    fetchJson(`/autonomous/decisions?limit=${limit}${pond_id ? `&pond_id=${pond_id}` : ""}`),
  getAutonomousActions: (pond_id?: number, limit: number = 50) =>
    fetchJson(`/autonomous/actions?limit=${limit}${pond_id ? `&pond_id=${pond_id}` : ""}`),
  triggerAutonomousEvaluate: (pond_id?: number) =>
    fetchJson("/autonomous/evaluate", {
      method: "POST",
      body: JSON.stringify({ pond_id }),
    }),
  manualAutonomousOverride: (action: string, pond_id?: number, operator_name?: string) =>
    fetchJson("/autonomous/override", {
      method: "POST",
      body: JSON.stringify({ action, pond_id, operator_name }),
    }),
  getAutonomousSafetyConfig: () => fetchJson("/autonomous/safety-config"),
  updateAutonomousSafetyConfig: (config: any) =>
    fetchJson("/autonomous/safety-config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),
  getAutonomousNotifications: (pond_id?: number, limit: number = 50) =>
    fetchJson(`/autonomous/notifications?limit=${limit}${pond_id ? `&pond_id=${pond_id}` : ""}`),
  simulateAutonomousScenario: (scenario: string, pond_id: number = 4) =>
    fetchJson("/autonomous/simulate-scenario", {
      method: "POST",
      body: JSON.stringify({ scenario, pond_id }),
    }),
  verifyAutonomousAction: (action_id: string) =>
    fetchJson(`/autonomous/verify-action/${action_id}`, {
      method: "POST",
    }),

  // Edge-Cloud Hybrid Architecture & Remote Farm Monitoring
  getCloudHybridStatus: () => fetchJson("/cloud/status"),
  getCloudGateways: () => fetchJson("/cloud/gateways"),
  sendEdgeHeartbeat: (gatewayId?: string) =>
    fetchJson(`/cloud/heartbeat?gateway_id=${gatewayId || "GW-NELLORE-DELTA-01"}`, {
      method: "POST",
    }),
  issueRemoteCommand: (data: any) =>
    fetchJson("/cloud/remote-command", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRemoteCommands: (pondId?: number) =>
    fetchJson(`/cloud/remote-commands${pondId ? `?pond_id=${pondId}` : ""}`),
  triggerCloudFlushSync: () =>
    fetchJson("/cloud/flush-sync", {
      method: "POST",
    }),
  getCloudSyncBatches: () => fetchJson("/cloud/sync-batches"),
  simulateNetworkCondition: (data: any) =>
    fetchJson("/cloud/simulate-network", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

