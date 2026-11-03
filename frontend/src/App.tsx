import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { SimulateEventModal } from "./components/SimulateEventModal";

// Pages
import { Dashboard } from "./pages/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoadingSkeleton } from "./components/PageLoadingSkeleton";
import { MobileBottomNav } from "./components/MobileBottomNav";

// Code-split secondary pages for bundle optimization and instant initial load
const AutonomousEngine = React.lazy(() => import("./pages/AutonomousEngine").then(m => ({ default: m.AutonomousEngine })));
const EdgeCloudHybrid = React.lazy(() => import("./pages/EdgeCloudHybrid").then(m => ({ default: m.EdgeCloudHybrid })));
const Ponds = React.lazy(() => import("./pages/Ponds").then(m => ({ default: m.Ponds })));
const PondDetail = React.lazy(() => import("./pages/PondDetail").then(m => ({ default: m.PondDetail })));
const WaterQuality = React.lazy(() => import("./pages/WaterQuality").then(m => ({ default: m.WaterQuality })));
const ClimateAdaptation = React.lazy(() => import("./pages/ClimateAdaptation").then(m => ({ default: m.ClimateAdaptation })));
const Feeding = React.lazy(() => import("./pages/Feeding").then(m => ({ default: m.Feeding })));
const Aeration = React.lazy(() => import("./pages/Aeration").then(m => ({ default: m.Aeration })));
const DiseaseIntelligence = React.lazy(() => import("./pages/DiseaseIntelligence").then(m => ({ default: m.DiseaseIntelligence })));
const ComputerVision = React.lazy(() => import("./pages/ComputerVision").then(m => ({ default: m.ComputerVision })));
const IoTDevices = React.lazy(() => import("./pages/IoTDevices").then(m => ({ default: m.IoTDevices })));
const Alerts = React.lazy(() => import("./pages/Alerts").then(m => ({ default: m.Alerts })));
const Analytics = React.lazy(() => import("./pages/Analytics").then(m => ({ default: m.Analytics })));
const ROIBusiness = React.lazy(() => import("./pages/ROIBusiness").then(m => ({ default: m.ROIBusiness })));
const FarmManagement = React.lazy(() => import("./pages/FarmManagement").then(m => ({ default: m.FarmManagement })));
const Maintenance = React.lazy(() => import("./pages/Maintenance").then(m => ({ default: m.Maintenance })));
const Reports = React.lazy(() => import("./pages/Reports").then(m => ({ default: m.Reports })));
const Settings = React.lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Auth = React.lazy(() => import("./pages/Auth").then(m => ({ default: m.Auth })));

const MainContent: React.FC = () => {
  const { activePage } = useApp();

  return (
    <div className="min-h-screen bg-[#F6F8F6] flex flex-col font-sans text-[#172820] antialiased selection:bg-[#E3F3E9] selection:text-[#174D39]">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-3 sm:p-5 md:p-7 lg:p-8 pb-20 lg:pb-8 overflow-y-auto">
          <ErrorBoundary>
            <React.Suspense fallback={<PageLoadingSkeleton />}>
              {activePage === "dashboard" && <Dashboard />}
              {activePage === "autonomous" && <AutonomousEngine />}
              {activePage === "edge-cloud" && <EdgeCloudHybrid />}
              {activePage === "ponds" && <Ponds />}
              {activePage === "pond-detail" && <PondDetail />}
              {activePage === "water-quality" && <WaterQuality />}
              {activePage === "climate" && <ClimateAdaptation />}
              {activePage === "feeding" && <Feeding />}
              {activePage === "aeration" && <Aeration />}
              {activePage === "disease" && <DiseaseIntelligence />}
              {activePage === "cv" && <ComputerVision />}
              {activePage === "devices" && <IoTDevices />}
              {activePage === "alerts" && <Alerts />}
              {activePage === "analytics" && <Analytics />}
              {activePage === "roi" && <ROIBusiness />}
              {activePage === "farm-mgmt" && <FarmManagement />}
              {activePage === "maintenance" && <Maintenance />}
              {activePage === "reports" && <Reports />}
              {activePage === "settings" && <Settings />}
              {activePage === "auth" && <Auth />}
            </React.Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <MobileBottomNav />
      <SimulateEventModal />
    </div>
  );
};


export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
