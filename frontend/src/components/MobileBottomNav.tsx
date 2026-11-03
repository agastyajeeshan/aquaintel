import React from "react";
import { useApp, PageId } from "../context/AppContext";
import {
  LayoutDashboard,
  Waves,
  Cpu,
  Bell,
  Menu,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const MobileBottomNav: React.FC = () => {
  const { activePage, setActivePage, activeAlertsCount, setIsMobileMenuOpen } = useApp();

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "ponds", label: "Ponds", icon: Waves },
    { id: "autonomous", label: "Auto Engine", icon: Cpu },
    { id: "alerts", label: "Alerts", icon: Bell, badge: activeAlertsCount },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E3EAE5] px-2 py-1 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activePage === item.id ||
            (item.id === "ponds" && activePage === "pond-detail");

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative ${
                isActive ? "text-[#247653] font-bold" : "text-[#68776F] hover:text-[#172820]"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? "text-[#247653]" : "text-[#68776F]"}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] font-black rounded-full bg-[#C84040] text-white animate-pulse min-w-[14px] text-center leading-tight">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[60px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Menu button to open the full mobile drawer */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[#68776F] hover:text-[#172820] transition-all"
        >
          <Menu className="h-5 w-5 text-[#68776F]" />
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
