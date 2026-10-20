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

const MainContent: React.FC = () => {
  const { activePage } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-teal-100 selection:text-teal-900">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {activePage === "dashboard" && <Dashboard />}
          {activePage === "ponds" && <Ponds />}
          {activePage === "pond-detail" && <PondDetail />}
          {activePage === "water-quality" && <WaterQuality />}
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
        </main>
      </div>

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
