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
  CloudSun,
  ShieldAlert,
  Bot,
  Network,
  X,
  Waves,
} from "lucide-react";

interface NavGroup {
  category: string;
  items: {
    id: PageId;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    category: "OVERVIEW",
    items: [
      { id: "dashboard", label: "Command Center", icon: LayoutDashboard },
      { id: "ponds", label: "Ponds Fleet", icon: Grid3X3, badge: "10" },
    ],
  },
  {
    category: "INTELLIGENCE",
    items: [
      { id: "autonomous", label: "Autonomous Engine", icon: Bot, badge: "AUTO" },
      { id: "water-quality", label: "Water Quality", icon: Activity },
      { id: "climate", label: "Climate Adaptation", icon: CloudSun, badge: "AI" },
      { id: "feeding", label: "Smart Feeding", icon: UtensilsCrossed },
      { id: "aeration", label: "Automated Aeration", icon: Wind },
      { id: "disease", label: "Disease Intelligence", icon: Microscope, badge: "AI" },
      { id: "cv", label: "Computer Vision", icon: Camera },
    ],
  },
  {
    category: "OPERATIONS",
    items: [
      { id: "edge-cloud", label: "Edge-Cloud Remote", icon: Network, badge: "HYBRID" },
      { id: "devices", label: "IoT Edge Devices", icon: Radio },
      { id: "alerts", label: "Alert Center", icon: AlertTriangle },
      { id: "maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
  {
    category: "MANAGEMENT",
    items: [
      { id: "analytics", label: "Growth Analytics", icon: BarChart3 },
      { id: "roi", label: "Commercial ROI", icon: TrendingUp },
      { id: "farm-mgmt", label: "Estate Asset Mgmt", icon: Layers },
      { id: "reports", label: "Compliance Reports", icon: FileText },
      { id: "settings", label: "Settings & RBAC", icon: Settings },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, activeAlertsCount, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();

  const handleNavClick = (pageId: PageId) => {
    setActivePage(pageId);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Dark Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar / Off-Canvas Drawer */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 lg:z-auto w-72 lg:w-64 bg-white border-r border-[#E3EAE5] flex flex-col shrink-0 min-h-[calc(100vh-4rem)] shadow-2xl lg:shadow-[0_2px_8px_rgba(30,60,45,0.02)] transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Mobile Drawer Header with Close Button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#E3EAE5] bg-[#F6F8F6]">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#247653] flex items-center justify-center text-white shadow-xs">
              <Waves className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-[#172820] tracking-tight">
                AQUA<span className="text-[#168B91]">INTEL</span>
              </span>
              <span className="block text-[10px] text-[#68776F] font-semibold">10-Ha Commercial Fleet</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-[#68776F] hover:bg-[#E3EAE5] hover:text-[#172820] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#68776F]">
                {group.category}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activePage === item.id ||
                  (activePage === "pond-detail" && item.id === "ponds");
                const isAlert = item.id === "alerts" && activeAlertsCount > 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? "bg-[#E3F3E9] text-[#247653] font-bold border-l-[3px] border-[#247653] shadow-[0_1px_3px_rgba(36,118,83,0.08)]"
                        : "text-[#68776F] hover:text-[#172820] hover:bg-[#EFF4F0]"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? "text-[#247653]" : "text-[#68776F]"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && !isAlert && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                          item.badge === "AI"
                            ? "bg-[#E8F5ED] text-[#247653] border border-[#C6E7D2]"
                            : "bg-[#EFF4F0] text-[#68776F]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {isAlert && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#C84040] text-white animate-pulse">
                        {activeAlertsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Estate Quick Spec Footer */}
        <div className="p-3.5 border-t border-[#E3EAE5] bg-[#F6F8F6] text-[11px] text-[#68776F] space-y-1.5 rounded-b-none">
          <div className="flex items-center justify-between">
            <span className="text-[#172820] font-semibold">10-Ha Estate</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EAF6EE] text-[#21845A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#21845A] animate-pulse" />
              10 Ponds Online
            </span>
          </div>
          <div className="flex justify-between text-[#68776F]">
            <span>Species:</span>
            <span className="font-medium text-[#172820]">P. vannamei</span>
          </div>
          <div className="flex justify-between text-[#68776F]">
            <span>Telemetry Link:</span>
            <span className="text-[#247653] font-semibold">LoRa 865.2 MHz</span>
          </div>
        </div>
      </aside>
    </>
  );
};

