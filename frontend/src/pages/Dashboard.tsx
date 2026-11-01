import React from "react";
import { useApp } from "../context/AppContext";
import {
  Waves,
  HeartPulse,
  AlertTriangle,
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
  const { overview, ponds, navigateToPondDetail, setActivePage, isOffline, offlineQueueCount, setIsSimulateModalOpen } = useApp();

  return (
    <div className="space-y-6">
      {/* Offline Alert Banner if simulated offline */}
      {isOffline && (
        <div className="p-4 rounded-2xl bg-[#FEF7EC] border border-[#F6DFB3] text-[#B7791F] flex items-center justify-between shadow-[0_2px_8px_rgba(183,121,31,0.06)] animate-pulse">
          <div className="flex items-center space-x-3">
            <Radio className="h-5 w-5 text-[#B7791F] shrink-0" />
            <div>
              <p className="font-bold text-sm text-[#172820]">
                OFFLINE MODE ACTIVATED — Edge Computing &amp; Local RTUs Active
              </p>
              <p className="text-xs text-[#68776F] mt-0.5">
                Pond automation, feeding safety and aeration hysteresis running locally. {offlineQueueCount} sensor records queued for cloud sync.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-[#F6DFB3] text-[#B7791F] text-xs font-bold rounded-lg shrink-0">
            Queued: {offlineQueueCount}
          </span>
        </div>
      )}

      {/* Page Title & Farm Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E3EAE5]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-extrabold text-[#172820] tracking-tight">
              Commercial Estate Command Center
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E3F3E9] text-[#247653] border border-[#C6E7D2]">
              Nellore Cluster
            </span>
          </div>
          <p className="text-xs text-[#68776F] font-medium mt-1">
            10-Hectare <span className="italic">Penaeus vannamei</span> Semi-Intensive Facility • Coastal Delta Basin
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="btn-secondary text-xs"
          >
            <Zap className="h-3.5 w-3.5 text-[#168B91]" />
            <span>Simulate Stress</span>
          </button>
          <button
            onClick={() => setActivePage("climate")}
            className="btn-primary text-xs"
          >
            <Droplets className="h-3.5 w-3.5" />
            <span>Climate Engine</span>
          </button>
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E3EAE5] shadow-[0_1px_3px_rgba(30,60,45,0.03)] text-xs font-medium text-[#172820]">
            <span className="h-2 w-2 rounded-full bg-[#21845A] animate-pulse" />
            <span>Telemetry Live</span>
          </div>
        </div>
      </div>

      {/* 1. Farm Overview Metrics (Clean Soft KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Ponds */}
        <div className="soft-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
              Total Estate
            </span>
            <Waves className="h-3.5 w-3.5 text-[#68776F]" />
          </div>
          <p className="text-2xl font-black text-[#172820] mt-1.5 tabular-nums">
            {overview?.total_ponds || 10}
          </p>
          <span className="text-[11px] text-[#68776F] font-medium block mt-0.5">
            10.0 Ha (1 Ha/pond)
          </span>
        </div>

        {/* Healthy Ponds */}
        <div className="soft-card p-4 bg-[#EAF6EE]/30 border-[#C6E7D2]/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#21845A] uppercase tracking-wider block">
              Healthy
            </span>
            <span className="h-2 w-2 rounded-full bg-[#21845A]" />
          </div>
          <p className="text-2xl font-black text-[#21845A] mt-1.5 tabular-nums">
            {overview?.healthy_ponds || 8}
          </p>
          <span className="text-[11px] text-[#21845A] font-semibold block mt-0.5">
            DO &gt; 5.0 • Safe NH₃
          </span>
        </div>

        {/* Warning Ponds */}
        <div className="soft-card p-4 bg-[#FEF7EC]/30 border-[#F6DFB3]/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#B7791F] uppercase tracking-wider block">
              Warning
            </span>
            <span className="h-2 w-2 rounded-full bg-[#B7791F]" />
          </div>
          <p className="text-2xl font-black text-[#B7791F] mt-1.5 tabular-nums">
            {overview?.warning_ponds || 1}
          </p>
          <span className="text-[11px] text-[#B7791F] font-semibold block mt-0.5">
            Temp/DO drift
          </span>
        </div>

        {/* Critical Ponds */}
        <div className="soft-card p-4 bg-[#FDF2F2]/30 border-[#F7C8C8]/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#C84040] uppercase tracking-wider block">
              Critical
            </span>
            <span className="h-2 w-2 rounded-full bg-[#C84040] animate-pulse" />
          </div>
          <p className="text-2xl font-black text-[#C84040] mt-1.5 tabular-nums">
            {overview?.critical_ponds || 1}
          </p>
          <span className="text-[11px] text-[#C84040] font-semibold block mt-0.5">
            Aeration boost active
          </span>
        </div>

        {/* Total Biomass */}
        <div className="soft-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
              Biomass
            </span>
            <TrendingUp className="h-3.5 w-3.5 text-[#168B91]" />
          </div>
          <p className="text-2xl font-black text-[#172820] mt-1.5 tabular-nums">
            {(overview?.total_biomass_kg || 12450).toLocaleString()} <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[11px] text-[#68776F] font-medium block mt-0.5">
            Avg: 1,245 kg / Ha
          </span>
        </div>

        {/* Today's Feed */}
        <div className="soft-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
              Feed Today
            </span>
            <UtensilsCrossed className="h-3.5 w-3.5 text-[#247653]" />
          </div>
          <p className="text-2xl font-black text-[#172820] mt-1.5 tabular-nums">
            {overview?.today_feed_kg || 384} <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[11px] text-[#68776F] font-medium block mt-0.5">
            Target FCR: 1.24
          </span>
        </div>

        {/* Energy Consumption */}
        <div className="soft-card p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
              Power Today
            </span>
            <Zap className="h-3.5 w-3.5 text-[#B7791F]" />
          </div>
          <p className="text-2xl font-black text-[#172820] mt-1.5 tabular-nums">
            {overview?.energy_consumption_kwh || 395} <span className="text-xs font-normal text-[#68776F]">kWh</span>
          </p>
          <span className="text-[11px] text-[#168B91] font-semibold block mt-0.5">
            ₹{(overview?.energy_cost_inr || 2962).toLocaleString()} (@₹7.5/u)
          </span>
        </div>
      </div>

      {/* 2. Infrastructure & Telemetry Health Strip */}
      <div className="soft-card p-3.5 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-4 sm:gap-6">
          <div className="flex items-center space-x-2">
            <span className="text-[#68776F] font-medium">Internet Link:</span>
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${isOffline ? "bg-[#FEF7EC] text-[#B7791F]" : "bg-[#EAF6EE] text-[#21845A]"}`}>
              {isOffline ? "OFFLINE (EDGE BUFFER)" : "ONLINE (4G PRIMARY)"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[#68776F] font-medium">LoRa Gateway (865.2 MHz):</span>
            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#EAF6EE] text-[#21845A]">
              ONLINE (RSSI -68 dBm)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[#68776F] font-medium">Sensor RTU Buoys:</span>
            <span className="font-bold text-[#172820] tabular-nums">
              {overview?.devices_online_ratio || "28/30"} Active
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[#68776F] font-medium">Cloud Queue:</span>
            <span className={`font-bold ${isOffline ? "text-[#B7791F]" : "text-[#21845A]"}`}>
              {isOffline ? `${offlineQueueCount} Stored` : "0 Pending (Synced)"}
            </span>
          </div>
        </div>

        <button
          onClick={() => setActivePage("devices")}
          className="text-xs font-semibold text-[#168B91] hover:text-[#0E6368] flex items-center space-x-1 transition-colors"
        >
          <span>View IoT Topology</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 3. 10 Ponds Interactive Status Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#172820]">
              Fleet Real-Time Water Matrix (10 Ponds)
            </h2>
            <p className="text-xs text-[#68776F]">
              Click any pond for time-series charts, aeration hysteresis logs, and feed dispensers
            </p>
          </div>
          <button
            onClick={() => setActivePage("ponds")}
            className="text-xs font-semibold text-[#247653] hover:text-[#174D39] flex items-center space-x-1 transition-colors"
          >
            <span>Full Fleet Directory</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {ponds.map((p) => {
            const isRed = p.status === "RED";
            const isYellow = p.status === "YELLOW";

            return (
              <div
                key={p.id}
                onClick={() => navigateToPondDetail(p.id)}
                className={`soft-card p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                  isRed
                    ? "border-[#F7C8C8] bg-[#FDF2F2]/20 hover:border-[#C84040]"
                    : isYellow
                    ? "border-[#F6DFB3] bg-[#FEF7EC]/20 hover:border-[#B7791F]"
                    : "hover:border-[#C6E7D2]"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#172820]">
                    {p.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isRed
                        ? "badge-soft-critical"
                        : isYellow
                        ? "badge-soft-warning"
                        : "badge-soft-success"
                    }`}
                  >
                    {isRed ? "CRITICAL" : isYellow ? "WARNING" : "HEALTHY"}
                  </span>
                </div>

                {p.active_event && (
                  <div className="mb-2 px-2 py-0.5 bg-[#FDF2F2] border border-[#F7C8C8] rounded-md text-[10px] font-bold text-[#C84040]">
                    Sim: {p.active_event}
                  </div>
                )}

                {/* Core Parameters */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-[#E3EAE5] my-2">
                  <div>
                    <span className="text-[10px] text-[#68776F] block font-medium">DO</span>
                    <span
                      className={`font-black tabular-nums ${
                        p.water_quality.do < 3.8
                          ? "text-[#C84040]"
                          : p.water_quality.do < 4.8
                          ? "text-[#B7791F]"
                          : "text-[#172820]"
                      }`}
                    >
                      {p.water_quality.do} <span className="text-[10px] font-normal text-[#68776F]">mg/L</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#68776F] block font-medium">TEMP</span>
                    <span className="font-bold text-[#172820] tabular-nums">
                      {p.water_quality.temperature} <span className="text-[10px] font-normal text-[#68776F]">°C</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#68776F] block font-medium">pH</span>
                    <span className="font-bold text-[#172820] tabular-nums">
                      {p.water_quality.ph}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#68776F] block font-medium">TAN / NH₃</span>
                    <span
                      className={`font-bold tabular-nums ${
                        p.water_quality.ammonia > 0.10
                          ? "text-[#C84040]"
                          : "text-[#172820]"
                      }`}
                    >
                      {p.water_quality.ammonia} <span className="text-[10px] font-normal text-[#68776F]">mg/L</span>
                    </span>
                  </div>
                </div>

                {/* Sub-status: Aerator & Feeder */}
                <div className="space-y-1.5 text-[11px] text-[#68776F] pt-0.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Wind className="h-3 w-3 text-[#68776F]" />
                      <span>Aerators:</span>
                    </span>
                    <span className="font-semibold text-[#172820] tabular-nums">
                      {p.aerator_summary.active_count}/{p.aerator_summary.total_count} ON
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <UtensilsCrossed className="h-3 w-3 text-[#68776F]" />
                      <span>Feeding:</span>
                    </span>
                    <span className="font-semibold text-[#172820] tabular-nums">
                      {p.feeding_summary.dispensed_today_kg} kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#EEF2EF]">
                    <span>Disease Risk:</span>
                    <span
                      className={`font-bold ${
                        p.disease_risk === "HIGH" || p.disease_risk === "CRITICAL"
                          ? "text-[#C84040]"
                          : p.disease_risk === "MEDIUM"
                          ? "text-[#B7791F]"
                          : "text-[#21845A]"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Urgent Alerts Card */}
        <div className="soft-card p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-[#C84040]" />
              <h3 className="text-sm font-bold text-[#172820]">
                Active Critical Farm Alerts
              </h3>
            </div>
            <button
              onClick={() => setActivePage("alerts")}
              className="text-xs font-semibold text-[#247653] hover:text-[#174D39]"
            >
              View All Alerts
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl border border-[#F7C8C8] bg-[#FDF2F2]/60">
              <div className="flex items-center justify-between text-xs font-bold text-[#C84040]">
                <span>Pond 08: Dissolved Oxygen Critical (3.4 mg/L)</span>
                <span className="badge-soft-critical text-[10px] px-2 py-0.5">
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-[#68776F] mt-1">
                Emergency aeration engaged on all 4 units. Morning feeding safely locked out.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-[#F6DFB3] bg-[#FEF7EC]/60">
              <div className="flex items-center justify-between text-xs font-bold text-[#B7791F]">
                <span>Pond 08: Elevated Toxic Ammonia (0.16 mg/L)</span>
                <span className="badge-soft-warning text-[10px] px-2 py-0.5">
                  WARNING
                </span>
              </div>
              <p className="text-xs text-[#68776F] mt-1">
                Nitrogen buildup detected at center trench. Bio-probiotic application recommended.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6]">
              <div className="flex items-center justify-between text-xs font-bold text-[#172820]">
                <span>Pond 04: High Water Temperature (32.8°C)</span>
                <span className="badge-neutral text-[10px] px-2 py-0.5">
                  ADVISORY
                </span>
              </div>
              <p className="text-xs text-[#68776F] mt-1">
                Midday thermal peak. Submersible jet aerator active for bottom circulation.
              </p>
            </div>
          </div>
        </div>

        {/* AI Disease Risk Intelligence Card */}
        <div className="soft-card p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3EAE5]">
            <div className="flex items-center space-x-2">
              <HeartPulse className="h-4 w-4 text-[#168B91]" />
              <h3 className="text-sm font-bold text-[#172820]">
                Disease Vulnerability Scoring (Explainable ML)
              </h3>
            </div>
            <button
              onClick={() => setActivePage("disease")}
              className="text-xs font-semibold text-[#168B91] hover:text-[#0E6368]"
            >
              Diagnostic Model
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-[#F7C8C8] bg-[#FDF2F2]/30 text-center">
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                WSSV Risk
              </span>
              <p className="text-lg font-black text-[#C84040] mt-1">HIGH</p>
              <p className="text-[10px] text-[#68776F] mt-0.5">
                Pond 08 (Thermal Stress)
              </p>
            </div>

            <div className="p-3 rounded-xl border border-[#F6DFB3] bg-[#FEF7EC]/30 text-center">
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Vibriosis
              </span>
              <p className="text-lg font-black text-[#B7791F] mt-1">MEDIUM</p>
              <p className="text-[10px] text-[#68776F] mt-0.5">
                Elevated Ammonia
              </p>
            </div>

            <div className="p-3 rounded-xl border border-[#C6E7D2] bg-[#EAF6EE]/30 text-center">
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                EMS / AHPND
              </span>
              <p className="text-lg font-black text-[#21845A] mt-1">LOW</p>
              <p className="text-[10px] text-[#68776F] mt-0.5">
                Stable pH &amp; Salinity
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#EFF4F0] border border-[#E3EAE5] text-xs text-[#172820]">
            <p className="font-semibold text-[#247653] flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-[#247653]" />
              Environmental Stress Prediction Only
            </p>
            <p className="text-[11px] text-[#68776F] mt-0.5 leading-relaxed">
              Models evaluate physiological vulnerability triggers. Laboratory RT-qPCR assays and veterinary inspection remain mandatory for confirmed viral/bacterial diagnosis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
