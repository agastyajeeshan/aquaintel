import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  Wind,
  UtensilsCrossed,
  Microscope,
  AlertTriangle,
  Play,
  Square,
  Clock,
  Sliders,
  ShieldAlert,
  Droplets,
  Calendar,
  CheckCircle,
} from "lucide-react";

export const PondDetail: React.FC = () => {
  const { selectedPondId, setActivePage, isOffline } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [activeTab, setActiveTab] = useState<string>("charts");
  const [actuatorMsg, setActuatorMsg] = useState<string>("");

  const loadPondData = async () => {
    try {
      setLoading(true);
      const res = await api.getPondDetail(selectedPondId, timeRange);
      setData(res);
    } catch (e) {
      console.warn("Failed to load pond details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPondData();
  }, [selectedPondId, timeRange]);

  const handleAeratorAction = async (aeratorId: number, action: string) => {
    try {
      const res = await api.controlAerator(aeratorId, action);
      setActuatorMsg(res.message);
      loadPondData();
      setTimeout(() => setActuatorMsg(""), 4000);
    } catch (e: any) {
      setActuatorMsg("Actuator command error: " + e.message);
    }
  };

  const handleFeederAction = async (feederId: number, action: string) => {
    try {
      const res = await api.controlFeeder(feederId, action, 2.5);
      setActuatorMsg(res.message);
      loadPondData();
      setTimeout(() => setActuatorMsg(""), 4000);
    } catch (e: any) {
      setActuatorMsg("Feeder command error: " + e.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        Loading telemetry and timeseries history for Pond {selectedPondId}...
      </div>
    );
  }

  const overview = data?.overview || {};
  const metrics = data?.live_metrics || {};
  const chartSeries = data?.chart_series || [];
  const aerators = data?.aerators || [];
  const feeder = data?.feeder;
  const disease = data?.disease_predictions || [];
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActivePage("ponds")}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-subtle"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {overview.name || `Pond 0${selectedPondId}`}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  overview.status === "RED"
                    ? "bg-rose-100 text-rose-800"
                    : overview.status === "YELLOW"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {overview.status === "RED" ? "CRITICAL STATUS" : overview.status === "YELLOW" ? "WARNING" : "HEALTHY"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              1.0 Hectare • Water Depth: 1.25m • Semi-Intensive L. vannamei
            </p>
          </div>
        </div>

        {/* Time Filter Pills (Requirement 7) */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <span className="text-slate-500 px-2 text-[11px]">TIMEFRAME:</span>
          {(["24h", "7d", "30d"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-3 py-1.5 rounded-lg uppercase transition-all ${
                timeRange === t
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t === "24h" ? "Past 24 Hours" : t === "7d" ? "Past 7 Days" : "Past 30 Days"}
            </button>
          ))}
        </div>
      </div>

      {actuatorMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 shadow-subtle animate-pulse">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actuatorMsg}</span>
        </div>
      )}

      {/* 1. Pond Overview Cards (Requirement 7) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Pond Area
          </span>
          <p className="text-xl font-black text-slate-900 mt-0.5">
            {overview.area_ha} Ha
          </p>
          <span className="text-[10px] text-slate-500">12,000 m³ volume</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Shrimp Age (DOC)
          </span>
          <p className="text-xl font-black text-slate-900 mt-0.5">
            {overview.current_age_days} <span className="text-xs font-normal text-slate-500">Days</span>
          </p>
          <span className="text-[10px] text-slate-500">Stocked: {overview.stocking_date ? overview.stocking_date.substring(0, 10) : "2026-08-20"}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Est. Biomass
          </span>
          <p className="text-xl font-black text-slate-900 mt-0.5">
            {overview.estimated_biomass_kg?.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
          </p>
          <span className="text-[10px] text-slate-500">Avg weight: ~18.5g</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Survival Rate
          </span>
          <p className="text-xl font-black text-emerald-700 mt-0.5">
            {overview.survival_rate_pct}%
          </p>
          <span className="text-[10px] text-slate-500">Initial: 450,000 PL</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Target FCR
          </span>
          <p className="text-xl font-black text-slate-900 mt-0.5">
            {overview.target_fcr}
          </p>
          <span className="text-[10px] text-teal-700 font-semibold">Automated feeding</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Stocking Density
          </span>
          <p className="text-xl font-black text-slate-900 mt-0.5">
            45 <span className="text-xs font-normal text-slate-500">PL / m²</span>
          </p>
          <span className="text-[10px] text-slate-500">Semi-Intensive</span>
        </div>
      </div>

      {/* 2. Water Quality Interactive Charts (Requirement 7) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Water Quality Telemetry Charts
            </h2>
            <p className="text-xs text-slate-500">
              High-frequency multi-probe optical timeseries ({timeRange} interval)
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="flex items-center space-x-1.5 text-teal-700">
              <span className="h-3 w-3 rounded-full bg-teal-500 inline-block" />
              <span>DO (mg/L)</span>
            </span>
            <span className="flex items-center space-x-1.5 text-blue-600">
              <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" />
              <span>Temp (°C)</span>
            </span>
            <span className="flex items-center space-x-1.5 text-purple-600">
              <span className="h-3 w-3 rounded-full bg-purple-500 inline-block" />
              <span>pH</span>
            </span>
            <span className="flex items-center space-x-1.5 text-rose-500">
              <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
              <span>Ammonia (mg/L)</span>
            </span>
          </div>
        </div>

        {/* Dual Charts: Chart 1 (DO & Temperature) */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Dissolved Oxygen (DO) & Water Temperature
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis yAxisId="left" domain={[2, 10]} tick={{ fontSize: 10, fill: "#0d9488" }} />
                <YAxis yAxisId="right" orientation="right" domain={[24, 36]} tick={{ fontSize: 10, fill: "#0284c7" }} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line yAxisId="left" type="monotone" dataKey="do" stroke="#0d9488" strokeWidth={2.5} dot={false} name="Dissolved Oxygen (mg/L)" />
                <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#0284c7" strokeWidth={2} dot={false} name="Temperature (°C)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: pH, Ammonia, Salinity */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. pH Balance, Ammonia (TAN), and Salinity
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis yAxisId="left" domain={[7, 9]} tick={{ fontSize: 10, fill: "#8b5cf6" }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 0.25]} tick={{ fontSize: 10, fill: "#e11d48" }} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line yAxisId="left" type="monotone" dataKey="ph" stroke="#8b5cf6" strokeWidth={2} dot={false} name="pH Value" />
                <Line yAxisId="right" type="monotone" dataKey="ammonia" stroke="#e11d48" strokeWidth={2} dot={false} name="Ammonia NH3 (mg/L)" />
                <Line yAxisId="left" type="monotone" dataKey="salinity" stroke="#059669" strokeWidth={1.5} dot={false} name="Salinity (ppt)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Aerators & Smart Feeder Actuator Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aerator Actuators */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Wind className="h-5 w-5 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900">
                Pond Aerators (4 Units Installed)
              </h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
              Smart Hysteresis Active
            </span>
          </div>

          <div className="space-y-3">
            {aerators.map((a: any) => {
              const isRunning = a.status === "RUNNING";
              return (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">
                        {a.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({a.code})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Power: {a.power_rating_kw} kW (2HP) • Today: {a.runtime_hours_today} hrs ({a.total_kwh_today} kWh)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isRunning
                          ? "bg-emerald-100 text-emerald-800 animate-pulse"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {isRunning ? "RUNNING" : "STANDBY"}
                    </span>

                    {isRunning ? (
                      <button
                        onClick={() => handleAeratorAction(a.id, "STOP")}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAeratorAction(a.id, "START")}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                      >
                        Start
                      </button>
                    )}

                    <button
                      onClick={() => handleAeratorAction(a.id, "EMERGENCY_OVERRIDE")}
                      title="Emergency Override"
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                    >
                      Override
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Automated Feeder Actuator */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Automated Solar Feeder Actuator
              </h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {feeder?.code || `FEEDER-P0${selectedPondId}`}
            </span>
          </div>

          {feeder && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Hopper Level</span>
                  <span className="text-base font-black text-slate-900">
                    {feeder.current_feed_level_kg} / {feeder.hopper_capacity_kg} kg
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Dispensed Today</span>
                  <span className="text-base font-black text-emerald-700">
                    {feeder.dispensed_today_kg} kg
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Next Scheduled</span>
                  <span className="text-base font-black text-slate-800">
                    {feeder.next_feeding_time}
                  </span>
                </div>
              </div>

              {/* Feeding Controls */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Actuator Remote Command
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleFeederAction(feeder.id, "START")}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Dispense Now (2.5 kg)</span>
                  </button>
                  <button
                    onClick={() => handleFeederAction(feeder.id, "STOP")}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  >
                    <Square className="h-3.5 w-3.5" />
                    <span>Stop Dispenser</span>
                  </button>
                  <button
                    onClick={() => handleFeederAction(feeder.id, "SCHEDULE")}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Update Timer</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
