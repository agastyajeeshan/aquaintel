import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, FarmOverview, PondSummary } from "../types";
import { api, ENV } from "../services/api";

export type WsConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING" | "FAILED";
export type OperatingState = "LIVE" | "DEMO" | "OFFLINE" | "CACHED" | "CONNECTING" | "ERROR";

export type PageId =
  | "dashboard"
  | "ponds"
  | "pond-detail"
  | "water-quality"
  | "feeding"
  | "aeration"
  | "disease"
  | "cv"
  | "devices"
  | "alerts"
  | "analytics"
  | "roi"
  | "farm-mgmt"
  | "maintenance"
  | "reports"
  | "settings"
  | "climate"
  | "autonomous"
  | "edge-cloud"
  | "auth";


interface AppContextType {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  selectedPondId: number;
  setSelectedPondId: (id: number) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  isOffline: boolean;
  setIsOffline: (val: boolean) => void;
  offlineQueueCount: number;
  setOfflineQueueCount: (val: number) => void;
  wsStatus: WsConnectionStatus;
  operatingState: OperatingState;
  lastUpdated: Date | null;
  dataSource: string;
  gatewayStatus: string;
  apiError: string | null;
  isHardwareConnected: boolean;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  overview: FarmOverview | null;
  ponds: PondSummary[];
  activeAlertsCount: number;
  isSimulateModalOpen: boolean;
  setIsSimulateModalOpen: (open: boolean) => void;
  refreshData: () => Promise<void>;
  navigateToPondDetail: (pondId: number) => void;
}

const defaultUser: User = {
  id: 1,
  username: "admin",
  email: "admin@aquaintel.io",
  full_name: "Dr. K. Srinivas",
  role: "ADMIN",
  phone: "+91 98480 11223",
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [selectedPondId, setSelectedPondId] = useState<number>(1);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>("CONNECTING");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  const [apiError, setApiError] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<string>("ONLINE");
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const [overview, setOverview] = useState<FarmOverview | null>(null);
  const [ponds, setPonds] = useState<PondSummary[]>([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(3);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);

  const isHardwareConnected = !isDemoMode && !isOffline && wsStatus === "CONNECTED";

  const operatingState: OperatingState = (() => {
    if (apiError) return "ERROR";
    if (isOffline) return "OFFLINE";
    if (wsStatus === "CONNECTING" && !overview) return "CONNECTING";
    if (wsStatus === "FAILED" || wsStatus === "DISCONNECTED") return "CACHED";
    if (isDemoMode) return "DEMO";
    return "LIVE";
  })();

  const dataSource = (() => {
    if (isDemoMode) return "Deterministic Coastal Aquaculture Simulation Engine";
    if (isOffline) return "Local Gateway Flash Buffer (Offline FIFO Spool)";
    if (wsStatus === "FAILED" || wsStatus === "DISCONNECTED") return "Local Browser Cache (Historical Readings)";
    return "Modbus RS485 Submerged Probes & Edge RTU Controller";
  })();

  const refreshData = async () => {
    try {
      const [ovData, pData] = await Promise.all([
        api.getFarmOverview(),
        api.getPonds(),
      ]);
      setOverview(ovData);
      setPonds(pData);
      setLastUpdated(new Date());
      setApiError(null);
      if (ovData?.active_alerts_count !== undefined) {
        setActiveAlertsCount(ovData.active_alerts_count);
      }
    } catch (e: any) {
      console.warn("Could not refresh live data from backend:", e);
      setApiError(e?.message || "Backend service unreachable");
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Live Telemetry Connection with Exponential Backoff
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let retryCount = 0;
    let isUnmounted = false;

    const connectWs = () => {
      if (isUnmounted) return;

      const wsUrl = ENV.getWsBaseUrl();
      setWsStatus(retryCount === 0 ? "CONNECTING" : "RECONNECTING");

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isUnmounted) return;
          console.log(`Telemetry WebSocket connected: ${wsUrl}`);
          setWsStatus("CONNECTED");
          retryCount = 0;
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "TELEMETRY_UPDATE") {
              setLastUpdated(new Date());
              if (data.is_offline !== undefined) {
                setIsOffline(data.is_offline);
                setOfflineQueueCount(data.offline_queue_count || 0);
              }
              // Update ponds live without page reload!
              if (Array.isArray(data.ponds) && data.ponds.length > 0) {
                setPonds((prev) => {
                  if (prev.length === 0) return prev;
                  return prev.map((p) => {
                    const update = data.ponds.find((up: any) => up.pond_id === p.id);
                    if (!update) return p;
                    return {
                      ...p,
                      status: update.status,
                      active_event: update.active_event,
                      water_quality: {
                        do: update.metrics?.do?.value ?? p.water_quality.do,
                        ph: update.metrics?.ph?.value ?? p.water_quality.ph,
                        temperature: update.metrics?.temperature?.value ?? p.water_quality.temperature,
                        ammonia: update.metrics?.ammonia?.value ?? p.water_quality.ammonia,
                        salinity: update.metrics?.salinity?.value ?? p.water_quality.salinity,
                        turbidity: update.metrics?.turbidity?.value ?? p.water_quality.turbidity,
                      },
                    };
                  });
                });
              }
            }
          } catch (err) {
            console.error("WS parse error", err);
          }
        };

        ws.onerror = () => {
          if (isUnmounted) return;
          setWsStatus(retryCount > 8 ? "FAILED" : "RECONNECTING");
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setWsStatus(retryCount > 8 ? "FAILED" : "DISCONNECTED");
          // Exponential backoff: 1s, 1.5s, 2.25s, ... capped at 30s + jitter
          const delay = Math.min(30000, 1000 * Math.pow(1.5, retryCount)) + Math.random() * 500;
          retryCount++;
          reconnectTimeout = setTimeout(connectWs, delay);
        };
      } catch (err) {
        if (isUnmounted) return;
        setWsStatus("FAILED");
        const delay = Math.min(30000, 2000 * Math.pow(1.5, retryCount));
        retryCount++;
        reconnectTimeout = setTimeout(connectWs, delay);
      }
    };

    connectWs();

    return () => {
      isUnmounted = true;
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      setWsStatus("DISCONNECTED");
    };
  }, []);

  const navigateToPondDetail = (pondId: number) => {
    setSelectedPondId(pondId);
    setActivePage("pond-detail");
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        selectedPondId,
        setSelectedPondId,
        isDemoMode,
        setIsDemoMode,
        isOffline,
        setIsOffline,
        offlineQueueCount,
        setOfflineQueueCount,
        wsStatus,
        operatingState,
        lastUpdated,
        dataSource,
        gatewayStatus,
        apiError,
        isHardwareConnected,
        currentUser,
        setCurrentUser,
        overview,
        ponds,
        activeAlertsCount,
        isSimulateModalOpen,
        setIsSimulateModalOpen,
        refreshData,
        navigateToPondDetail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
