import React from "react";
import { useApp } from "../context/AppContext";
import {
  Waves,
  HeartPulse,
  AlertTriangle,
  Flame,
  Zap,
  TrendingUp,
  Radio,
  ArrowRight,
  ShieldAlert,
  Droplets,
  Wind,
  UtensilsCrossed,
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { overview, ponds, navigateToPondDetail, setActivePage, isOffline, offlineQueueCount } = useApp();

  return (
    <div className="space-y-6">
      {/* Offline Alert Banner if simulated offline */}
      {isOffline && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between shadow-subtle animate-pulse">
          <div className="flex items-center space-x-3">
            <Radio className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-bold text-sm">
                OFFLINE MODE ACTIVATED — Edge Computing & Local RTUs Active
              </p>
              <p className="text-xs text-amber-700">
                Pond automation, feeding safety and aeration hysteresis running locally. {offlineQueueCount} sensor records queued for cloud sync.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-amber-200 text-amber-900 text-xs font-bold rounded-lg">
            Queued: {offlineQueueCount}
          </span>
        </div>
      )}

      {/* Page Title & Farm Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Commercial Farm Command Center
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            10-Hectare Penaeus vannamei Semi-Intensive Facility • Nellore Delta, AP
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
            Live Telemetry Streaming
          </span>
        </div>
      </div>

      {/* 1. Farm Overview Metrics (Requirement 5) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Ponds */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Total Ponds
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {overview?.total_ponds || 10}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            10.0 Hectares (1 Ha each)
          </span>
        </div>

        {/* Healthy Ponds */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-subtle bg-emerald-50/20">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
            Healthy Ponds
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {overview?.healthy_ponds || 8}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            DO &gt; 5.0 • Ammonia safe
          </span>
        </div>

        {/* Warning Ponds */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-subtle bg-amber-50/20">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
            Warning Ponds
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {overview?.warning_ponds || 1}
          </p>
          <span className="text-[11px] text-amber-600 font-semibold">
            Parameter drift detected
          </span>
        </div>

        {/* Critical Ponds */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-subtle bg-rose-50/20">
          <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
            Critical Ponds
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {overview?.critical_ponds || 1}
          </p>
          <span className="text-[11px] text-rose-600 font-semibold">
            Emergency aeration active
          </span>
        </div>

        {/* Total Biomass */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Total Biomass
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {(overview?.total_biomass_kg || 12450).toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Avg: 1,245 kg / Ha
          </span>
        </div>

        {/* Today's Feed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Today's Feed
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {overview?.today_feed_kg || 384} <span className="text-xs font-normal text-slate-500">kg</span>
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            FCR Target: 1.24
          </span>
        </div>

        {/* Energy Consumption */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Power Today
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {overview?.energy_consumption_kwh || 395} <span className="text-xs font-normal text-slate-500">kWh</span>
          </p>
          <span className="text-[11px] text-teal-700 font-semibold">
            ₹{(overview?.energy_cost_inr || 2962).toLocaleString()} (@₹7.5/u)
          </span>
        </div>
      </div>

      {/* 2. Quick Infrastructure & Connectivity Health Banner (Requirement 21) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-subtle flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Internet Link:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${isOffline ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {isOffline ? "OFFLINE (CACHED)" : "ONLINE (4G PRIMARY)"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">LoRa Gateway (865 MHz):</span>
            <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
              ONLINE
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Sensor & RTU Nodes:</span>
            <span className="font-bold text-slate-900">
              {overview?.devices_online_ratio || "28/30"} Online
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Data Sync:</span>
            <span className={`font-bold ${isOffline ? "text-amber-600" : "text-emerald-700"}`}>
              {isOffline ? `${offlineQueueCount} Queued` : "ACTIVE"}
            </span>
          </div>
        </div>

        <button
          onClick={() => setActivePage("devices")}
          className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center space-x-1"
        >
          <span>View IoT Architecture</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 3. 10 Ponds Interactive Status Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pond Fleet Real-Time Monitoring (10 Ponds)
            </h2>
            <p className="text-xs text-slate-500">
              Select any pond to view deep-dive analytics, interactive charts, and manual overrides
            </p>
          </div>
          <button
            onClick={() => setActivePage("ponds")}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
          >
            <span>Full Pond Management View</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ponds.map((p) => {
            const isRed = p.status === "RED";
            const isYellow = p.status === "YELLOW";

            return (
              <div
                key={p.id}
                onClick={() => navigateToPondDetail(p.id)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-card hover:-translate-y-0.5 ${
                  isRed
                    ? "border-rose-300 ring-2 ring-rose-200/50"
                    : isYellow
                    ? "border-amber-300 ring-1 ring-amber-100"
                    : "border-slate-200 hover:border-teal-300"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-slate-900">
                    {p.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isRed
                        ? "bg-rose-100 text-rose-800"
                        : isYellow
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {isRed ? "CRITICAL" : isYellow ? "WARNING" : "HEALTHY"}
                  </span>
                </div>

                {p.active_event && (
                  <div className="mb-2 px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded text-[10px] font-bold text-rose-700">
                    Active Sim: {p.active_event}
                  </div>
                )}

                {/* Core Parameters */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 my-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">DO</span>
                    <span
                      className={`font-black ${
                        p.water_quality.do < 3.8
                          ? "text-rose-600 font-extrabold"
                          : p.water_quality.do < 4.8
                          ? "text-amber-600"
                          : "text-slate-800"
                      }`}
                    >
                      {p.water_quality.do} <span className="text-[10px] font-normal text-slate-400">mg/L</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">TEMP</span>
                    <span className="font-bold text-slate-800">
                      {p.water_quality.temperature} <span className="text-[10px] font-normal text-slate-400">°C</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">pH</span>
                    <span className="font-bold text-slate-800">
                      {p.water_quality.ph}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">AMMONIA</span>
                    <span
                      className={`font-bold ${
                        p.water_quality.ammonia > 0.10
                          ? "text-rose-600 font-extrabold"
                          : "text-slate-800"
                      }`}
                    >
                      {p.water_quality.ammonia} <span className="text-[10px] font-normal text-slate-400">mg/L</span>
                    </span>
                  </div>
                </div>

                {/* Sub-status: Aerator & Feeder */}
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Wind className="h-3 w-3 text-slate-400" />
                      <span>Aerators:</span>
                    </span>
                    <span className="font-bold text-slate-800">
                      {p.aerator_summary.active_count}/{p.aerator_summary.total_count} ON
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <UtensilsCrossed className="h-3 w-3 text-slate-400" />
                      <span>Feeding:</span>
                    </span>
                    <span className="font-bold text-slate-800">
                      {p.feeding_summary.dispensed_today_kg} kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Disease Risk:</span>
                    <span
                      className={`font-bold ${
                        p.disease_risk === "HIGH" || p.disease_risk === "CRITICAL"
                          ? "text-rose-600"
                          : p.disease_risk === "MEDIUM"
                          ? "text-amber-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {p.disease_risk}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Split: Active Alerts & AI Disease Risk Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Alerts Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Critical Farm Alerts Requiring Attention
              </h3>
            </div>
            <button
              onClick={() => setActivePage("alerts")}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              View All Alerts
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/60">
              <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                <span>Pond 08: Dissolved Oxygen Crash (3.4 mg/L)</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 text-[10px]">
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-rose-700 mt-1">
                Emergency aeration engaged on all 4 units. Morning feeding safely halted.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                <span>Pond 08: Elevated Toxic Ammonia (0.16 mg/L)</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">
                  HIGH
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Nitrogen buildup detected at center trench. Bio-probiotic application recommended.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Pond 04: High Water Temperature (32.8°C)</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                  WARNING
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Thermal peak during 14:00 window. Submersible jet aerator active for water cooling.
              </p>
            </div>
          </div>
        </div>

        {/* AI Disease Risk Intelligence Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HeartPulse className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                AI Disease Risk Prediction (Explainable ML Pilot)
              </h3>
            </div>
            <button
              onClick={() => setActivePage("disease")}
              className="text-xs font-bold text-teal-700 hover:text-teal-800"
            >
              Risk Engine Detail
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                WSSV Risk
              </span>
              <p className="text-lg font-black text-rose-600 mt-1">HIGH</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Pond 08 (Low DO + Stress)
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Vibriosis
              </span>
              <p className="text-lg font-black text-amber-600 mt-1">MEDIUM</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Elevated Ammonia
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                EMS / AHPND
              </span>
              <p className="text-lg font-black text-emerald-600 mt-1">LOW</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Stable pH & Salinity
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200 text-xs text-teal-900">
            <p className="font-semibold">
              Notice: AI-based disease risk prediction only.
            </p>
            <p className="text-[11px] text-teal-700 mt-0.5">
              Laboratory PCR/microbiological confirmation is required for clinical diagnosis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
