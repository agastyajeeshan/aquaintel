/**
 * AquaIntel Frontend Environment & Connectivity Configuration
 * Centralizes API and WebSocket connection URLs, timeouts, and auth keys.
 * Supports local development, Docker, staging, production, and Android WebView/Capacitor builds.
 */

export const ENV = {
  getApiBaseUrl(): string {
    const custom = import.meta.env.VITE_API_BASE_URL;
    if (custom && typeof custom === "string" && custom.trim() !== "") {
      return custom.replace(/\/+$/, "");
    }

    if (typeof window !== "undefined" && window.location) {
      const { protocol, hostname, port } = window.location;
      // In Vite dev server mode (default port 5173), target the FastAPI backend at port 8000
      if (port === "5173") {
        return `${protocol}//${hostname}:8000/api`;
      }
      // In production or reverse-proxy deployments, use relative /api
      return `${window.location.origin}/api`;
    }

    return "http://localhost:8000/api";
  },

  getWsBaseUrl(): string {
    const custom = import.meta.env.VITE_WS_BASE_URL;
    if (custom && typeof custom === "string" && custom.trim() !== "") {
      return custom.replace(/\/+$/, "");
    }

    if (typeof window !== "undefined" && window.location) {
      const { protocol, hostname, port } = window.location;
      const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
      const host = port === "5173" ? `${hostname}:8000` : window.location.host;
      return `${wsProtocol}//${host}/ws/telemetry`;
    }

    return "ws://localhost:8000/ws/telemetry";
  },

  getExportCsvUrl(): string {
    return `${this.getApiBaseUrl()}/reports/export-csv`;
  },

  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000,
  authTokenKey: import.meta.env.VITE_AUTH_TOKEN_KEY || "aquaintel_auth_token",
};

export default ENV;
