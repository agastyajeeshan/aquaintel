import React from "react";
import { useApp } from "../context/AppContext";
import type { PageId } from "../context/AppContext";
import {
  LayoutDashboard,
  Grid3X3,
  Activity,
  UtensilsCrossed,
  Wind,
  Microscope,
  Camera,
  Radio,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Layers,
  Wrench,
  FileText,
  Settings,
} from "lucide-react";

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "ponds", label: "Ponds", icon: Grid3X3, badge: "10" },
  { id: "water-quality", label: "Water Quality", icon: Activity },
  { id: "feeding", label: "Smart Feeding", icon: UtensilsCrossed },
  { id: "aeration", label: "Automated Aeration", icon: Wind },
  { id: "disease", label: "Disease Intelligence", icon: Microscope, badge: "AI" },
  { id: "cv", label: "Computer Vision", icon: Camera },
  { id: "devices", label: "IoT Devices", icon: Radio },
  { id: "alerts", label: "Alert Center", icon: AlertTriangle },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "roi", label: "ROI & Commercial", icon: TrendingUp },
  { id: "farm-mgmt", label: "Farm Management", icon: Layers },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, activeAlertsCount } = useApp();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Core Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activePage === item.id ||
            (activePage === "pond-detail" && item.id === "ponds");
          const isAlert = item.id === "alerts" && activeAlertsCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-bold shadow-subtle"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-emerald-700" : "text-slate-500"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && !isAlert && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600">
                  {item.badge}
                </span>
              )}
              {isAlert && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                  {activeAlertsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Farm Quick Spec Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-500 space-y-1">
        <div className="flex justify-between font-semibold text-slate-700">
          <span>Active Estate:</span>
          <span>10 Ha (10 Ponds)</span>
        </div>
        <div className="flex justify-between">
          <span>Species:</span>
          <span>P. vannamei</span>
        </div>
        <div className="flex justify-between">
          <span>Telemetry:</span>
          <span className="text-emerald-700 font-semibold">LoRa IN865</span>
        </div>
      </div>
    </aside>
  );
};
