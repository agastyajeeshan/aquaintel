import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  Waves,
  Wifi,
  WifiOff,
  Bell,
  SlidersHorizontal,
  FlaskConical,
  Database,
  AlertOctagon,
  RefreshCw,
  Info,
  X,
  Menu,
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
    operatingState,
    lastUpdated,
    dataSource,
    apiError,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useApp();

  const [showDemoBanner, setShowDemoBanner] = useState<boolean>(true);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  useEffect(() => {
    const updateDiff = () => {
      if (lastUpdated) {
        const diff = Math.max(0, Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000));
        setSecondsAgo(diff);
      }
    };
    updateDiff();
    const interval = setInterval(updateDiff, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

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

  const renderStateBadge = () => {
    switch (operatingState) {
      case "LIVE":
        return (
          <div
            title={`Real Farm Stream • Data Source: ${dataSource}`}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#E3F3E9] border border-[#C6E7D2] text-[11px] font-bold text-[#247653]"
          >
            <span className="h-2 w-2 rounded-full bg-[#21845A] animate-pulse" />
            <span>LIVE SENSORS</span>
            <span className="text-[10px] text-[#247653]/70 font-medium">({secondsAgo}s)</span>
          </div>
        );
      case "DEMO":
        return (
          <div
            title={`Simulation Engine Active • Data Source: ${dataSource}`}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE] text-[11px] font-bold text-[#6D28D9]"
          >
            <FlaskConical className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span>DEMO SIMULATION</span>
            <span className="text-[10px] text-[#7C3AED]/70 font-medium">({secondsAgo}s)</span>
          </div>
        );
      case "OFFLINE":
        return (
          <div
            title={`Offline FIFO Spool Active • ${offlineQueueCount} packets queued`}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#FEF7EC] border border-[#F6DFB3] text-[11px] font-bold text-[#B7791F]"
          >
            <WifiOff className="h-3.5 w-3.5 text-[#B7791F]" />
            <span>OFFLINE BUFFER ({offlineQueueCount})</span>
          </div>
        );
      case "CACHED":
        return (
          <div
            title="Backend or WebSocket disconnected. Showing last known cached values."
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#F1F5F9] border border-[#CBD5E1] text-[11px] font-bold text-[#475569]"
          >
            <Database className="h-3.5 w-3.5 text-[#64748B]" />
            <span>CACHED DATA</span>
            <span className="text-[10px] text-[#64748B]">({secondsAgo}s)</span>
          </div>
        );
      case "CONNECTING":
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[11px] font-bold text-[#1D4ED8]">
            <RefreshCw className="h-3.5 w-3.5 text-[#2563EB] animate-spin" />
            <span>CONNECTING...</span>
          </div>
        );
      case "ERROR":
      default:
        return (
          <div
            title={apiError || "API communication failure"}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[11px] font-bold text-[#DC2626]"
          >
            <AlertOctagon className="h-3.5 w-3.5 text-[#DC2626]" />
            <span>LINK ERROR</span>
          </div>
        );
    }
  };

  return (
    <>
      <header className="bg-white border-b border-[#E3EAE5] sticky top-0 z-30 shadow-[0_2px_8px_rgba(30,60,45,0.03)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Branding & Farm Identity */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#172820] hover:bg-[#EFF4F0] border border-[#E3EAE5] transition-colors"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="h-5 w-5 text-[#247653]" />
            </button>

            <div className="h-10 w-10 rounded-xl bg-[#247653] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(36,118,83,0.22)] shrink-0">
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#172820]">
                  AQUA<span className="text-[#168B91]">INTEL</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E3F3E9] text-[#247653] border border-[#C6E7D2]">
                  10-HA COMMERCIAL
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#68776F] font-medium leading-none mt-0.5 truncate max-w-[180px] sm:max-w-none">
                Autonomous Prawn Farm &amp; Predictive Intelligence • Nellore, AP
              </p>
            </div>
          </div>

          {/* Right: Controls, Telemetry Indicator & User Profile */}
          <div className="flex items-center space-x-2.5">
            {/* Operating State Badge */}
            {renderStateBadge()}

            {/* Real vs Demo Toggle */}
            <div className="hidden md:flex items-center bg-[#EFF4F0] rounded-xl p-0.5 border border-[#E3EAE5] text-xs font-semibold">
              <button
                onClick={() => setIsDemoMode(false)}
                title="Switch to Real Physical Hardware Mode"
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
                  !isDemoMode
                    ? "bg-white text-[#172820] shadow-[0_1px_3px_rgba(30,60,45,0.06)] font-bold"
                    : "text-[#68776F] hover:text-[#172820]"
                }`}
              >
                REAL DATA
              </button>
              <button
                onClick={() => setIsDemoMode(true)}
                title="Switch to Deterministic Coastal Aquaculture Simulator"
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
                  isDemoMode
                    ? "bg-[#247653] text-white shadow-[0_1px_4px_rgba(36,118,83,0.25)] font-bold"
                    : "text-[#68776F] hover:text-[#172820]"
                }`}
              >
                DEMO MODE
              </button>
            </div>

            {/* Offline Mode Toggle & Queue Badge */}
            <button
              onClick={handleToggleOffline}
              title={
                isOffline
                  ? "Offline Mode Active (Simulated disconnection - queued locally)"
                  : "Online Mode Active (Live Telemetry)"
              }
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isOffline
                  ? "bg-[#FEF7EC] text-[#B7791F] border-[#F6DFB3] animate-pulse"
                  : "bg-white text-[#68776F] border-[#E3EAE5] hover:bg-[#EFF4F0] hover:text-[#172820]"
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-[#B7791F]" />
                  <span className="hidden sm:inline">OFFLINE</span>
                  <span className="px-1.5 py-0.2 bg-[#F6DFB3] text-[#B7791F] rounded-full text-[10px] font-bold">
                    {offlineQueueCount} queued
                  </span>
                </>
              ) : (
                <>
                  <Wifi className="h-3.5 w-3.5 text-[#21845A]" />
                  <span className="hidden sm:inline text-[#21845A]">ONLINE</span>
                </>
              )}
            </button>

            {/* Simulate Event Button */}
            <button
              onClick={() => setIsSimulateModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EFF4F0] text-[#172820] border border-[#E3EAE5] hover:bg-[#E3F3E9] hover:text-[#247653] hover:border-[#C6E7D2] transition-colors shadow-[0_1px_3px_rgba(30,60,45,0.02)]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#168B91]" />
              <span className="hidden sm:inline">Simulate Event</span>
            </button>

            {/* Alerts Bell */}
            <button
              onClick={() => setActivePage("alerts")}
              className="relative p-2 rounded-xl text-[#68776F] hover:bg-[#EFF4F0] hover:text-[#172820] transition-colors border border-transparent hover:border-[#E3EAE5]"
              title="Alert Center"
            >
              <Bell className="h-4.5 w-4.5" />
              {activeAlertsCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-[#C84040] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2 pl-2 border-l border-[#E3EAE5]">
              <div className="h-8 w-8 rounded-full bg-[#E3F3E9] border border-[#C6E7D2] flex items-center justify-center font-bold text-xs text-[#247653] shadow-sm">
                {currentUser.full_name?.charAt(0) || "U"}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-[#172820] leading-tight">
                  {currentUser.full_name}
                </p>
                <span className="text-[10px] font-semibold text-[#247653] uppercase tracking-wider block">
                  {currentUser.role.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Explicit Demo Mode Notification Banner */}
      {isDemoMode && showDemoBanner && (
        <div className="bg-[#FAF5FF] border-b border-[#E9D5FF] px-4 py-2 text-xs text-[#6B21A8] flex items-center justify-between">
          <div className="flex items-center space-x-2 max-w-[1600px] mx-auto w-full">
            <Info className="h-4 w-4 text-[#7C3AED] shrink-0" />
            <p className="font-medium">
              <span className="font-bold">SIMULATION MODE ACTIVE:</span> Pond metrics, climate curves, and feeding responses are generated by the deterministic coastal aquaculture simulation model. Real physical hardware is currently disengaged.
            </p>
            <button
              onClick={() => setShowDemoBanner(false)}
              className="ml-auto text-[#6B21A8] hover:text-[#4C1D95] p-1"
              title="Dismiss banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
