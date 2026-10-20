import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, FarmOverview, PondSummary } from "../types";
import { api } from "../services/api";

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
  | "settings";

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
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const [overview, setOverview] = useState<FarmOverview | null>(null);
  const [ponds, setPonds] = useState<PondSummary[]>([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(3);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);

  const refreshData = async () => {
    try {
      const [ovData, pData] = await Promise.all([
        api.getFarmOverview(),
        api.getPonds(),
      ]);
      setOverview(ovData);
      setPonds(pData);
      if (ovData?.active_alerts_count !== undefined) {
        setActiveAlertsCount(ovData.active_alerts_count);
      }
    } catch (e) {
      console.warn("Could not refresh live data from backend:", e);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Live Telemetry Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket("ws://localhost:8000/ws/telemetry");
        ws.onopen = () => {
          console.log("Telemetry WebSocket connected");
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "TELEMETRY_UPDATE") {
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
                        do: update.metrics.do.value,
                        ph: update.metrics.ph.value,
                        temperature: update.metrics.temperature.value,
                        ammonia: update.metrics.ammonia.value,
                        salinity: update.metrics.salinity.value,
                        turbidity: update.metrics.turbidity.value,
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
        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 4000);
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectWs, 4000);
      }
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
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
