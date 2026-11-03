import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { SimulateEventModal } from "./components/SimulateEventModal";

// Pages
import { Dashboard } from "./pages/Dashboard";
import { Ponds } from "./pages/Ponds";
import { PondDetail } from "./pages/PondDetail";
import { WaterQuality } from "./pages/WaterQuality";
import { Feeding } from "./pages/Feeding";
import { Aeration } from "./pages/Aeration";
import { DiseaseIntelligence } from "./pages/DiseaseIntelligence";
import { ComputerVision } from "./pages/ComputerVision";
import { IoTDevices } from "./pages/IoTDevices";
import { Alerts } from "./pages/Alerts";
import { Analytics } from "./pages/Analytics";
import { ROIBusiness } from "./pages/ROIBusiness";
import { FarmManagement } from "./pages/FarmManagement";
import { Maintenance } from "./pages/Maintenance";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Auth } from "./pages/Auth";
import { ClimateAdaptation } from "./pages/ClimateAdaptation";
import { AutonomousEngine } from "./pages/AutonomousEngine";
import { EdgeCloudHybrid } from "./pages/EdgeCloudHybrid";

import { MobileBottomNav } from "./components/MobileBottomNav";

const MainContent: React.FC = () => {
  const { activePage } = useApp();

  return (
    <div className="min-h-screen bg-[#F6F8F6] flex flex-col font-sans text-[#172820] antialiased selection:bg-[#E3F3E9] selection:text-[#174D39]">
      <Navbar />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-3 sm:p-5 md:p-7 lg:p-8 pb-20 lg:pb-8 overflow-y-auto">
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
