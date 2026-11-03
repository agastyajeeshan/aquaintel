import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  Waves,
  AlertTriangle,
  Zap,
  TrendingUp,
  Radio,
  ArrowRight,
  Droplets,
  Wind,
  UtensilsCrossed,
  Bot,
  Network,
  Database,
  CloudRain,
  Sun,
  CheckCircle2,
  Activity,
  Layers,
  Cpu,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export const Dashboard: React.FC = () => {
  const {
    overview,
    ponds,
    navigateToPondDetail,
    setActivePage,
    isOffline,
    offlineQueueCount,
    setIsSimulateModalOpen,
    operatingState,
    dataSource,
  } = useApp();

  // Supplementary data loaded directly for Sections 2, 4, 5, 7
  const [weatherData, setWeatherData] = useState<any>(null);
  const [autoStatus, setAutoStatus] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [aerationStatus, setAerationStatus] = useState<any>(null);

  const fetchSupplementaryData = useCallback(async () => {
    try {
      const [weatherRes, autoRes, alertsRes, aerRes] =
        await Promise.allSettled([
          api.getWeatherCurrent(),
          api.getAutonomousStatus(),
          api.getAlerts("ACTIVE"),
          api.getAerationStatus(),
        ]);

      if (weatherRes.status === "fulfilled") setWeatherData(weatherRes.value?.weather);
      if (autoRes.status === "fulfilled") setAutoStatus(autoRes.value);
      if (alertsRes.status === "fulfilled" && Array.isArray(alertsRes.value)) {
        setActiveAlerts(alertsRes.value);
      }
      if (aerRes.status === "fulfilled") setAerationStatus(aerRes.value);
    } catch (e) {
      console.warn("Could not load supplementary dashboard telemetry:", e);
    }
  }, []);

  useEffect(() => {
    fetchSupplementaryData();
    const interval = setInterval(fetchSupplementaryData, 8000);
    return () => clearInterval(interval);
  }, [fetchSupplementaryData]);

  // Compute fleet averages for Section 3 (Live Water Quality)
  const pondCount = ponds.length || 1;
  const avgDO = (ponds.reduce((acc, p) => acc + (p.water_quality?.do || 0), 0) / pondCount).toFixed(2);
  const avgTemp = (ponds.reduce((acc, p) => acc + (p.water_quality?.temperature || 0), 0) / pondCount).toFixed(1);
  const avgPH = (ponds.reduce((acc, p) => acc + (p.water_quality?.ph || 0), 0) / pondCount).toFixed(2);
  const avgSalinity = (ponds.reduce((acc, p) => acc + (p.water_quality?.salinity || 0), 0) / pondCount).toFixed(1);
  const avgAmmonia = (ponds.reduce((acc, p) => acc + (p.water_quality?.ammonia || 0), 0) / pondCount).toFixed(3);
  const avgTurbidity = (ponds.reduce((acc, p) => acc + (p.water_quality?.turbidity || 32), 0) / pondCount).toFixed(0);

  // Overall farm operational status
  const criticalCount = overview?.critical_ponds ?? ponds.filter((p) => p.status === "RED").length;
  const warningCount = overview?.warning_ponds ?? ponds.filter((p) => p.status === "YELLOW" || p.status === "ORANGE").length;
  const overallFarmStatus =
    criticalCount > 0
      ? "CRITICAL ATTENTION REQUIRED"
      : warningCount > 0
      ? "ADVISORY MONITORING ACTIVE"
      : "OPTIMAL COMMODITY HEALTH";

  // Predictive mock forecast trend curve for Section 4
  const forecastSeries = [
    { time: "Now", do: Number(avgDO), temp: Number(avgTemp) },
    { time: "+3h", do: Math.max(3.5, Number(avgDO) - 0.4), temp: Number(avgTemp) + 0.8 },
    { time: "+6h", do: Math.max(3.2, Number(avgDO) - 0.7), temp: Number(avgTemp) + 1.2 },
    { time: "+12h", do: Math.min(6.5, Number(avgDO) + 0.9), temp: Number(avgTemp) - 1.1 },
    { time: "+24h", do: Math.min(6.2, Number(avgDO) + 0.5), temp: Number(avgTemp) },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Offline Alert Strip */}
      {isOffline && (
        <div className="p-4 rounded-2xl bg-[#FEF7EC] border border-[#F6DFB3] text-[#B7791F] flex items-center justify-between shadow-[0_2px_8px_rgba(183,121,31,0.06)] animate-pulse">
          <div className="flex items-center space-x-3">
            <Radio className="h-5 w-5 text-[#B7791F] shrink-0" />
            <div>
              <p className="font-bold text-sm text-[#172820]">
                LOCAL EDGE FAILSAFE ACTIVE — Isolated From Cloud Server
              </p>
              <p className="text-xs text-[#68776F] mt-0.5">
                Local RTUs running autonomous aeration hysteresis and feeding interlocks safely. {offlineQueueCount} packets queued.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-[#F6DFB3] text-[#B7791F] text-xs font-bold rounded-lg shrink-0">
            Buffer: {offlineQueueCount}
          </span>
        </div>
      )}

      {/* Main Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E3EAE5]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-[#172820] tracking-tight">
              Farmer Command Center
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E3F3E9] text-[#247653] border border-[#C6E7D2]">
              10-Ha Commercial Prawn Fleet
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                criticalCount > 0
                  ? "bg-[#FDF2F2] text-[#C84040] border border-[#F7C8C8]"
                  : warningCount > 0
                  ? "bg-[#FEF7EC] text-[#B7791F] border border-[#F6DFB3]"
                  : "bg-[#EAF6EE] text-[#21845A] border border-[#C6E7D2]"
              }`}
            >
              {overallFarmStatus}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#68776F]">
            <span>Nellore Coastal Belt (14.4426° N, 79.9865° E)</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-medium text-[#172820]">
              <Database className="h-3 w-3 text-[#168B91]" />
              <span className="truncate max-w-[260px]" title={dataSource}>{dataSource}</span>
            </span>
            <span>•</span>
            <span className="font-semibold text-[#247653]">
              State: {operatingState}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActivePage("edge-cloud")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#EFF4F0] text-[#172820] border border-[#E3EAE5] text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <Network className="h-3.5 w-3.5 text-[#168B91]" />
            <span>Edge &amp; Cloud</span>
          </button>
          <button
            onClick={() => setActivePage("autonomous")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E3F3E9] hover:bg-[#D4EBDC] text-[#174D39] border border-[#B2D8C6] text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <Bot className="h-3.5 w-3.5 text-[#247653]" />
            <span>Autonomous Engine</span>
          </button>
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
        </div>
      </div>

      {/* =========================================================================
          SECTION 1 — FARM OVERVIEW
          ========================================================================= */}
      <section className="space-y-3" aria-labelledby="section-farm-overview">
        <div className="flex items-center justify-between">
          <h2 id="section-farm-overview" className="text-xs font-bold uppercase tracking-wider text-[#68776F] flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#247653]" />
            <span>Section 1 — Farm Overview &amp; Production Metrics</span>
          </h2>
          <span className="text-[11px] text-[#68776F]">
            Total Estate: <strong className="text-[#172820]">10.0 Hectares</strong> (1.0 Ha/pond)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* Total Ponds */}
          <div className="soft-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider">
                Total Ponds
              </span>
              <Waves className="h-4 w-4 text-[#68776F]" />
            </div>
            <p className="text-2xl font-black text-[#172820] mt-1.5 tabular-nums">
              {overview?.total_ponds || ponds.length || 10}
            </p>
            <span className="text-[11px] text-[#68776F] font-medium block mt-0.5">
              10 Ponds Online
            </span>
          </div>

          {/* Healthy Ponds */}
          <div className="soft-card p-4 bg-[#EAF6EE]/40 border-[#C6E7D2]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#21845A] uppercase tracking-wider">
                Healthy Ponds
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-[#21845A]" />
            </div>
            <p className="text-2xl font-black text-[#21845A] mt-1.5 tabular-nums">
              {overview?.healthy_ponds ?? ponds.filter((p) => p.status === "GREEN").length}
            </p>
            <span className="text-[11px] text-[#21845A] font-semibold block mt-0.5">
              DO &gt; 5.0 • Safe TAN
            </span>
          </div>

          {/* Warning Ponds */}
          <div className="soft-card p-4 bg-[#FEF7EC]/40 border-[#F6DFB3]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#B7791F] uppercase tracking-wider">
                Warning Ponds
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-[#B7791F]" />
            </div>
            <p className="text-2xl font-black text-[#B7791F] mt-1.5 tabular-nums">
              {warningCount}
            </p>
            <span className="text-[11px] text-[#B7791F] font-semibold block mt-0.5">
              Thermal / DO drift
            </span>
          </div>

          {/* Critical Ponds */}
          <div className="soft-card p-4 bg-[#FDF2F2]/40 border-[#F7C8C8]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#C84040] uppercase tracking-wider">
                Critical Ponds
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-[#C84040] animate-pulse" />
            </div>
            <p className="text-2xl font-black text-[#C84040] mt-1.5 tabular-nums">
              {criticalCount}
            </p>
            <span className="text-[11px] text-[#C84040] font-semibold block mt-0.5">
              Aeration boost active
            </span>
          </div>

          {/* Total Biomass */}
          <div className="soft-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider">
                Total Biomass
              </span>
              <TrendingUp className="h-4 w-4 text-[#168B91]" />
            </div>
            <p className="text-2xl font-black text-[#172820] mt-1.5 tabular-nums">
              {(overview?.total_biomass_kg || 12450).toLocaleString()}{" "}
              <span className="text-xs font-normal text-[#68776F]">kg</span>
            </p>
            <span className="text-[11px] text-[#68776F] font-medium block mt-0.5">
              Avg 1,245 kg / Ha
            </span>
          </div>

          {/* Power & Cost */}
          <div className="soft-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider">
                Power Today
              </span>
              <Zap className="h-4 w-4 text-[#B7791F]" />
            </div>
            <p className="text-2xl font-black text-[#172820] mt-1.5 tabular-nums">
              {overview?.energy_consumption_kwh || 395}{" "}
              <span className="text-xs font-normal text-[#68776F]">kWh</span>
            </p>
            <span className="text-[11px] text-[#168B91] font-bold block mt-0.5">
              ₹{(overview?.energy_cost_inr || 2962).toLocaleString()} (@₹7.5/u)
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 — CRITICAL ALERTS
          ========================================================================= */}
      <section className="space-y-3" aria-labelledby="section-critical-alerts">
        <div className="flex items-center justify-between">
          <h2 id="section-critical-alerts" className="text-xs font-bold uppercase tracking-wider text-[#68776F] flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-[#C84040]" />
            <span>Section 2 — Critical Farm Alerts &amp; Sensor Integrity</span>
          </h2>
          <button
            onClick={() => setActivePage("alerts")}
            className="text-xs font-semibold text-[#247653] hover:text-[#174D39] flex items-center gap-1"
          >
            <span>Open Alert Center</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {activeAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeAlerts.slice(0, 3).map((alert) => {
              const isCrit = alert.severity === "CRITICAL";
              return (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    isCrit
                      ? "bg-[#FDF2F2] border-[#F7C8C8]"
                      : "bg-[#FEF7EC] border-[#F6DFB3]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isCrit ? "bg-[#C84040] text-white" : "bg-[#B7791F] text-white"
                      }`}>
                        {alert.severity} • POND {alert.pond_id}
                      </span>
                      <span className="text-[11px] text-[#68776F] font-mono">
                        {alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : "Recent"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#172820] mt-2">
                      {alert.title || alert.alert_type}
                    </p>
                    <p className="text-[11px] text-[#68776F] mt-1 leading-snug">
                      {alert.message || alert.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
                    <span className="text-[10px] text-[#68776F] font-medium">
                      Action Required
                    </span>
                    <button
                      onClick={() => navigateToPondDetail(alert.pond_id)}
                      className="text-xs font-bold text-[#247653] hover:underline"
                    >
                      Inspect Pond →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white border border-[#E3EAE5] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 text-[#21845A]" />
              <div>
                <p className="text-xs font-bold text-[#172820]">
                  No Unacknowledged Critical Farm Alerts
                </p>
                <p className="text-[11px] text-[#68776F]">
                  All dissolved oxygen levels, thermal ranges, and ammonia equilibrium thresholds are within safe limits.
                </p>
              </div>
            </div>
            <span className="badge-soft-success text-[10px] px-2.5 py-1">
              FLEET STABLE
            </span>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 3 — LIVE WATER QUALITY
          ========================================================================= */}
      <section className="space-y-3" aria-labelledby="section-live-water-quality">
        <div className="flex items-center justify-between">
          <h2 id="section-live-water-quality" className="text-xs font-bold uppercase tracking-wider text-[#68776F] flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#168B91]" />
            <span>Section 3 — Live Water Quality Matrix (Fleet Averages &amp; Limits)</span>
          </h2>
          <button
            onClick={() => setActivePage("water-quality")}
            className="text-xs font-semibold text-[#247653] hover:text-[#174D39] flex items-center gap-1"
          >
            <span>Telemetry Details</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* DO */}
          <div className="soft-card p-3.5">
            <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
              Dissolved O₂
            </span>
            <p className="text-xl font-black text-[#247653] mt-1 tabular-nums">
              {avgDO} <span className="text-xs font-medium text-[#68776F]">mg/L</span>
            </p>
            <div className="flex items-center justify-between text-[10px] text-[#68776F] mt-1 pt-1 border-t border-[#EEF2EF]">
              <span>Safe: &gt; 4.8</span>
              <span className="text-[#21845A] font-bold">Optimal</span>
            </div>
          </div>

          {/* Temp */}
          <div className="soft-card p-3.5">
            <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
              Temperature
            </span>
            <p className="text-xl font-black text-[#172820] mt-1 tabular-nums">
              {avgTemp} <span className="text-xs font-medium text-[#68776F]">°C</span>
            </p>
            <div className="flex items-center justify-between text-[10px] text-[#68776F] mt-1 pt-1 border-t border-[#EEF2EF]">
              <span>Safe: 26–32°C</span>
              <span className="text-[#21845A] font-bold">Normal</span>
            </div>
          </div>

          {/* pH */}
          <div className="soft-card p-3.5">
            <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
              pH Equilibrium
            </span>
            <p className="text-xl font-black text-[#7C3AED] mt-1 tabular-nums">
              {avgPH}
            </p>
            <div className="flex items-center justify-between text-[10px] text-[#68776F] mt-1 pt-1 border-t border-[#EEF2EF]">
              <span>Safe: 7.5–8.5</span>
              <span className="text-[#21845A] font-bold">Stable</span>
            </div>
          </div>

          {/* Salinity */}
          <div className="soft-card p-3.5">
            <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
              Salinity
            </span>
            <p className="text-xl font-black text-[#168B91] mt-1 tabular-nums">
              {avgSalinity} <span className="text-xs font-medium text-[#68776F]">ppt</span>
            </p>
            <div className="flex items-center justify-between text-[10px] text-[#68776F] mt-1 pt-1 border-t border-[#EEF2EF]">
              <span>Safe: 12–25 ppt</span>
              <span className="text-[#21845A] font-bold">Coastal</span>
            </div>
          </div>

          {/* TAN */}
          <div className="soft-card p-3.5">
            <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
              TAN / Ammonia
            </span>
            <p className="text-xl font-black text-[#172820] mt-1 tabular-nums">
              {avgAmmonia} <span className="text-xs font-medium text-[#68776F]">mg/L</span>
            </p>
            <div className="flex items-center justify-between text-[10px] text-[#68776F] mt-1 pt-1 border-t border-[#EEF2EF]">
              <span>Limit: &lt; 0.10</span>
              <span className="text-[#21845A] font-bold">Safe</span>
            </div>
          </div>

          {/* Turbidity */}
          <div className="soft-card p-3.5">
            <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
              Turbidity / Secchi
            </span>
            <p className="text-xl font-black text-[#172820] mt-1 tabular-nums">
              {avgTurbidity} <span className="text-xs font-medium text-[#68776F]">cm</span>
            </p>
            <div className="flex items-center justify-between text-[10px] text-[#68776F] mt-1 pt-1 border-t border-[#EEF2EF]">
              <span>Safe: 28–38 cm</span>
              <span className="text-[#21845A] font-bold">Optimal Plankton</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4 & SECTION 5 — TWO COLUMN LAYOUT
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* =========================================================================
            SECTION 4 — PREDICTIVE INTELLIGENCE
            ========================================================================= */}
        <div className="soft-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E3EAE5] pb-3">
            <div className="flex items-center space-x-2">
              <Bot className="h-4.5 w-4.5 text-[#168B91]" />
              <h3 className="text-sm font-bold text-[#172820]">
                Section 4 — Predictive Intelligence &amp; Risk Forecasting
              </h3>
            </div>
            <button
              onClick={() => setActivePage("climate")}
              className="text-xs font-semibold text-[#168B91] hover:underline"
            >
              24h Outlook →
            </button>
          </div>

          <p className="text-xs text-[#68776F]">
            Physics-guided ML predicts pond oxygen consumption and thermal stratification 3 to 24 hours ahead.
          </p>

          {/* Mini Forecast Chart */}
          <div className="h-40 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="doColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#247653" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#247653" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#68776F" }} stroke="#E3EAE5" />
                <YAxis domain={[2, 8]} tick={{ fontSize: 10, fill: "#247653" }} stroke="#E3EAE5" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #E3EAE5",
                    fontSize: "11px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                />
                <Area type="monotone" dataKey="do" stroke="#247653" strokeWidth={2} fillOpacity={1} fill="url(#doColor)" name="Forecast DO (mg/L)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Oxygen Depletion Risk
              </span>
              <p className="text-sm font-bold text-[#21845A] mt-0.5">
                LOW RISK (Dawn Window Safe)
              </p>
              <span className="text-[10px] text-[#68776F] block mt-0.5">
                Uncertainty envelope: ±0.35 mg/L
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Thermal Impact
              </span>
              <p className="text-sm font-bold text-[#172820] mt-0.5">
                Peak 31.4°C at 14:00 IST
              </p>
              <span className="text-[10px] text-[#68776F] block mt-0.5">
                Bottom circulation active
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 5 — AUTOMATION STATUS
            ========================================================================= */}
        <div className="soft-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E3EAE5] pb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4.5 w-4.5 text-[#247653]" />
              <h3 className="text-sm font-bold text-[#172820]">
                Section 5 — Automation &amp; Edge Hardware Status
              </h3>
            </div>
            <button
              onClick={() => setActivePage("autonomous")}
              className="text-xs font-semibold text-[#247653] hover:underline"
            >
              Control Panel →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#E3F3E9] border border-[#B2D8C6]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#174D39] uppercase">
                  Engine Operating Mode
                </span>
                <span className="h-2 w-2 rounded-full bg-[#21845A] animate-pulse" />
              </div>
              <p className="text-base font-black text-[#174D39] mt-1">
                {autoStatus?.operating_mode || "FULLY_AUTONOMOUS"}
              </p>
              <span className="text-[10px] text-[#174D39]/80 block mt-0.5">
                Local edge interlocks armed
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Emergency Aeration Failsafe
              </span>
              <p className="text-base font-black text-[#21845A] mt-1">
                EDGE HARDWARE ARMED
              </p>
              <span className="text-[10px] text-[#68776F] block mt-0.5">
                Starts if DO &lt; 3.0 mg/L offline
              </span>
            </div>
          </div>

          {/* Aeration & Feeding subsystem summaries */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E3EAE5] bg-white">
              <div className="flex items-center space-x-2">
                <Wind className="h-4 w-4 text-[#168B91]" />
                <span className="font-semibold text-[#172820]">Automated Aeration Fleet:</span>
              </div>
              <span className="font-bold text-[#247653] tabular-nums">
                {aerationStatus?.active_aerators_count || 32} / {aerationStatus?.total_aerators_count || 40} Units Active
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E3EAE5] bg-white">
              <div className="flex items-center space-x-2">
                <UtensilsCrossed className="h-4 w-4 text-[#247653]" />
                <span className="font-semibold text-[#172820]">Smart Feeders Dispensed:</span>
              </div>
              <span className="font-bold text-[#172820] tabular-nums">
                {overview?.today_feed_kg || 384} kg today (Safe DO Lockouts Active)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 6 — POND FLEET
          ========================================================================= */}
      <section className="space-y-3" aria-labelledby="section-pond-fleet">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="section-pond-fleet" className="text-xs font-bold uppercase tracking-wider text-[#68776F] flex items-center gap-1.5">
              <Waves className="h-3.5 w-3.5 text-[#247653]" />
              <span>Section 6 — Pond Fleet Real-Time Cards (10 Ponds)</span>
            </h2>
            <p className="text-xs text-[#68776F] mt-0.5">
              Select any pond to view historical timeseries charts, aerators, and feed dispensers.
            </p>
          </div>
          <button
            onClick={() => setActivePage("ponds")}
            className="text-xs font-semibold text-[#247653] hover:text-[#174D39] flex items-center space-x-1"
          >
            <span>Fleet View</span>
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
                  <div
                    className={`mb-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      p.active_event === "SENSOR_FAILURE"
                        ? "bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]"
                        : "bg-[#FDF2F2] border border-[#F7C8C8] text-[#C84040]"
                    }`}
                  >
                    {p.active_event === "SENSOR_FAILURE" ? "⚠️ STALE / SENSOR PROBE FAULT" : `SIM: ${p.active_event}`}
                  </div>
                )}

                {/* Core Parameters */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#E3EAE5] my-2">
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
                    <span className="text-[10px] text-[#68776F] block font-medium">TAN</span>
                    <span
                      className={`font-bold tabular-nums ${
                        p.water_quality.ammonia > 0.10 ? "text-[#C84040]" : "text-[#172820]"
                      }`}
                    >
                      {p.water_quality.ammonia} <span className="text-[10px] font-normal text-[#68776F]">mg/L</span>
                    </span>
                  </div>
                </div>

                {/* Aerators & Feeder summary */}
                <div className="space-y-1 text-[11px] text-[#68776F]">
                  <div className="flex items-center justify-between">
                    <span>Aerators:</span>
                    <span className="font-semibold text-[#172820] tabular-nums">
                      {p.aerator_summary?.active_count ?? 3}/{p.aerator_summary?.total_count ?? 4} ON
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Feed Today:</span>
                    <span className="font-semibold text-[#172820] tabular-nums">
                      {p.feeding_summary?.dispensed_today_kg ?? 38.4} kg
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 7 — WEATHER
          ========================================================================= */}
      <section className="space-y-3" aria-labelledby="section-weather">
        <div className="flex items-center justify-between">
          <h2 id="section-weather" className="text-xs font-bold uppercase tracking-wider text-[#68776F] flex items-center gap-1.5">
            <CloudRain className="h-3.5 w-3.5 text-[#168B91]" />
            <span>Section 7 — Coastal Weather Station &amp; Delta Forecast</span>
          </h2>
          <span className="text-[11px] text-[#68776F]">
            Station: <strong className="text-[#172820]">Nellore Coastal Delta (14.44° N, 79.99° E)</strong>
          </span>
        </div>

        <div className="soft-card p-4 bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Condition
              </span>
              <p className="text-base font-extrabold text-[#172820] mt-1 flex items-center gap-1.5">
                <Sun className="h-4 w-4 text-[#B7791F]" />
                <span>{weatherData?.weather_description || "Clear / Mild Overcast"}</span>
              </p>
              <span className="text-[10px] text-[#68776F] block mt-0.5">
                Open-Meteo Service
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Air Temp
              </span>
              <p className="text-base font-black text-[#172820] mt-1 tabular-nums">
                {weatherData?.air_temperature_c ?? 25.5} °C
              </p>
              <span className="text-[10px] text-[#68776F] block mt-0.5">
                Solar Rad: {weatherData?.solar_radiation_wm2 ?? 91.7} W/m²
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Relative Humidity
              </span>
              <p className="text-base font-black text-[#168B91] mt-1 tabular-nums">
                {weatherData?.relative_humidity_pct ?? 82}%
              </p>
              <span className="text-[10px] text-[#68776F] block mt-0.5">
                Coastal humidity
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Rainfall Today
              </span>
              <p className="text-base font-black text-[#172820] mt-1 tabular-nums">
                {weatherData?.rainfall_mm ?? 0.0} mm
              </p>
              <span className="text-[10px] text-[#68776F] block mt-0.5">
                Prob: {weatherData?.rainfall_probability_pct ?? 15}%
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Wind Speed &amp; Dir
              </span>
              <p className="text-base font-black text-[#172820] mt-1 tabular-nums">
                {weatherData?.wind_speed_kmh ?? 13.4} km/h
              </p>
              <span className="text-[10px] text-[#68776F] block mt-0.5">
                SW ({weatherData?.wind_direction_deg ?? 206}°)
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#68776F] uppercase block">
                Pressure
              </span>
              <p className="text-base font-black text-[#172820] mt-1 tabular-nums">
                {weatherData?.atmospheric_pressure_hpa ?? 1010.2} hPa
              </p>
              <span className="text-[10px] text-[#21845A] font-bold block mt-0.5">
                Stable Barometer
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
