import React from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  Waves,
  Wifi,
  WifiOff,
  Bell,
  PlayCircle,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const {
    isDemoMode,
    setIsDemoMode,
    isOffline,
    setIsOffline,
    offlineQueueCount,
    activeAlertsCount,
    currentUser,
    setIsSimulateModalOpen,
    setActivePage,
    refreshData,
  } = useApp();

  const handleToggleOffline = async () => {
    const nextState = !isOffline;
    setIsOffline(nextState);
    try {
      await api.toggleOffline(nextState);
      refreshData();
    } catch (e) {
      console.warn("Failed to toggle offline on backend", e);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Branding & Farm Identity */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-sm">
            <Waves className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight text-slate-900">
                AQUA<span className="text-teal-600">INTEL</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                10-HA COMMERCIAL
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Smart Prawn Farm Automation & AI Disease Risk Management
            </p>
          </div>
        </div>

        {/* Right: Controls & User */}
        <div className="flex items-center space-x-3">
          {/* Real vs Demo Toggle */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setIsDemoMode(false)}
              className={`px-2.5 py-1 rounded transition-colors ${
                !isDemoMode
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              REAL DATA
            </button>
            <button
              onClick={() => setIsDemoMode(true)}
              className={`px-2.5 py-1 rounded transition-colors ${
                isDemoMode
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              DEMO MODE
            </button>
          </div>

          {/* Offline Mode Toggle & Queue Badge */}
          <div className="flex items-center">
            <button
              onClick={handleToggleOffline}
              title={
                isOffline
                  ? "Offline Mode Active (Simulated disconnection - queued locally)"
                  : "Online Mode Active (Live Telemetry)"
              }
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isOffline
                  ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                  <span>OFFLINE MODE</span>
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full font-bold">
                    {offlineQueueCount} queued
                  </span>
                </>
              ) : (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                  <span>ONLINE</span>
                </>
              )}
            </button>
          </div>

          {/* Simulate Event Button */}
          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors shadow-sm"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Simulate Event</span>
          </button>

          {/* Alerts Bell */}
          <button
            onClick={() => setActivePage("alerts")}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {activeAlertsCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
              {currentUser.full_name?.charAt(0) || "U"}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser.full_name}
              </p>
              <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                {currentUser.role.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
