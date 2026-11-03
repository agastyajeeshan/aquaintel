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
  Play,
  Square,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { CommandSafetyModal } from "../components/CommandSafetyModal";

export const PondDetail: React.FC = () => {
  const { selectedPondId, setActivePage } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [actuatorMsg, setActuatorMsg] = useState<string>("");

  // Safety modal state
  const [safetyModal, setSafetyModal] = useState<{
    isOpen: boolean;
    type: "AERATOR" | "FEEDER";
    id: number;
    name: string;
    action: string;
    currentDO?: number;
    amountKg?: number;
  }>({
    isOpen: false,
    type: "AERATOR",
    id: 0,
    name: "",
    action: "",
  });

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

  const triggerAeratorSafetyModal = (aerator: any, action: string) => {
    setSafetyModal({
      isOpen: true,
      type: "AERATOR",
      id: aerator.id,
      name: `${aerator.name} (${aerator.code})`,
      action,
      currentDO: data?.overview?.water_quality?.do,
    });
  };

  const triggerFeederSafetyModal = (feeder: any, action: string, amountKg: number = 2.5) => {
    setSafetyModal({
      isOpen: true,
      type: "FEEDER",
      id: feeder.id,
      name: feeder.name || `Feeder P0${selectedPondId}`,
      action,
      amountKg,
      currentDO: data?.overview?.water_quality?.do,
    });
  };

  const handleExecuteSafetyAction = async () => {
    if (safetyModal.type === "AERATOR") {
      const res = await api.controlAerator(safetyModal.id, safetyModal.action);
      setActuatorMsg(res.message);
      loadPondData();
      setTimeout(() => setActuatorMsg(""), 4000);
      return res;
    } else {
      const res = await api.controlFeeder(safetyModal.id, safetyModal.action, safetyModal.amountKg || 2.5);
      setActuatorMsg(res.message);
      loadPondData();
      setTimeout(() => setActuatorMsg(""), 4000);
      return res;
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
  const chartSeries = data?.chart_series || [];
  const aerators = data?.aerators || [];
  const feeder = data?.feeder;
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E3EAE5]">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={() => setActivePage("ponds")}
            className="p-2.5 rounded-xl bg-white border border-[#E3EAE5] text-[#172820] hover:bg-[#EFF4F0] transition-colors shadow-[0_1px_3px_rgba(30,60,45,0.03)]"
            title="Back to Ponds Fleet"
          >
            <ArrowLeft className="h-4.5 w-4.5 text-[#172820]" />
          </button>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-extrabold text-[#172820] tracking-tight">
                {overview.name || `Pond 0${selectedPondId}`}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  overview.status === "RED"
                    ? "badge-soft-critical"
                    : overview.status === "YELLOW"
                    ? "badge-soft-warning"
                    : "badge-soft-success"
                }`}
              >
                {overview.status === "RED" ? "CRITICAL STATUS" : overview.status === "YELLOW" ? "WARNING" : "HEALTHY"}
              </span>
            </div>
            <p className="text-xs text-[#68776F] font-medium mt-0.5">
              1.0 Hectare • Water Depth: 1.25m • Semi-Intensive <span className="italic">L. vannamei</span>
            </p>
          </div>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-[#EFF4F0] p-1 rounded-xl border border-[#E3EAE5] text-xs font-semibold">
          <span className="text-[#68776F] px-2 text-[10px] uppercase font-bold tracking-wider">WINDOW:</span>
          {(["24h", "7d", "30d"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeRange === t
                  ? "bg-white text-[#172820] shadow-[0_1px_3px_rgba(30,60,45,0.06)] font-bold"
                  : "text-[#68776F] hover:text-[#172820]"
              }`}
            >
              {t === "24h" ? "24 Hours" : t === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {actuatorMsg && (
        <div className="p-3.5 rounded-xl bg-[#EAF6EE] border border-[#C6E7D2] text-[#21845A] text-xs font-bold flex items-center space-x-2 shadow-[0_2px_8px_rgba(33,132,90,0.08)] animate-pulse">
          <CheckCircle className="h-4 w-4 text-[#21845A] shrink-0" />
          <span>{actuatorMsg}</span>
        </div>
      )}

      {/* 1. Pond Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="soft-card p-3.5">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Pond Area
          </span>
          <p className="text-xl font-extrabold text-[#172820] mt-1 tabular-nums">
            {overview.area_ha} Ha
          </p>
          <span className="text-[10px] text-[#68776F]">12,000 m³ volume</span>
        </div>

        <div className="soft-card p-3.5">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Shrimp Age (DOC)
          </span>
          <p className="text-xl font-extrabold text-[#172820] mt-1 tabular-nums">
            {overview.current_age_days} <span className="text-xs font-normal text-[#68776F]">Days</span>
          </p>
          <span className="text-[10px] text-[#68776F]">Stocked: {overview.stocking_date ? overview.stocking_date.substring(0, 10) : "2026-08-20"}</span>
        </div>

        <div className="soft-card p-3.5">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Est. Biomass
          </span>
          <p className="text-xl font-extrabold text-[#172820] mt-1 tabular-nums">
            {overview.estimated_biomass_kg?.toLocaleString()} <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[10px] text-[#68776F]">Avg weight: ~18.5g</span>
        </div>

        <div className="soft-card p-3.5">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Survival Rate
          </span>
          <p className="text-xl font-extrabold text-[#21845A] mt-1 tabular-nums">
            {overview.survival_rate_pct}%
          </p>
          <span className="text-[10px] text-[#68776F]">Initial: 450,000 PL</span>
        </div>

        <div className="soft-card p-3.5">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Target FCR
          </span>
          <p className="text-xl font-extrabold text-[#172820] mt-1 tabular-nums">
            {overview.target_fcr}
          </p>
          <span className="text-[10px] text-[#168B91] font-semibold">Automated feeding</span>
        </div>

        <div className="soft-card p-3.5">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Stocking Density
          </span>
          <p className="text-xl font-extrabold text-[#172820] mt-1 tabular-nums">
            45 <span className="text-xs font-normal text-[#68776F]">PL / m²</span>
          </p>
          <span className="text-[10px] text-[#68776F]">Semi-Intensive</span>
        </div>
      </div>

      {/* 2. Water Quality Interactive Charts */}
      <div className="soft-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E3EAE5] gap-4">
          <div>
            <h2 className="text-base font-extrabold text-[#172820]">
              Water Quality Telemetry Timeseries
            </h2>
            <p className="text-xs text-[#68776F]">
              High-frequency multi-probe optical telemetry ({timeRange} historical window)
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3 text-xs font-semibold">
            <span className="flex items-center space-x-1.5 text-[#247653]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#247653] inline-block" />
              <span>DO (mg/L)</span>
            </span>
            <span className="flex items-center space-x-1.5 text-[#168B91]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#168B91] inline-block" />
              <span>Temp (°C)</span>
            </span>
            <span className="flex items-center space-x-1.5 text-purple-700">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-600 inline-block" />
              <span>pH</span>
            </span>
            <span className="flex items-center space-x-1.5 text-[#C84040]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C84040] inline-block" />
              <span>Ammonia (mg/L)</span>
            </span>
          </div>
        </div>

        {/* Dual Charts: Chart 1 (DO & Temperature) */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#172820] uppercase tracking-wider">
            1. Dissolved Oxygen (DO) &amp; Water Temperature Profile
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2EF" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: "#68776F" }} stroke="#E3EAE5" />
                <YAxis yAxisId="left" domain={[2, 10]} tick={{ fontSize: 10, fill: "#247653" }} stroke="#E3EAE5" />
                <YAxis yAxisId="right" orientation="right" domain={[24, 36]} tick={{ fontSize: 10, fill: "#168B91" }} stroke="#E3EAE5" />
                <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E3EAE5", fontSize: "12px", boxShadow: "0 4px 14px rgba(30,60,45,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line yAxisId="left" type="monotone" dataKey="do" stroke="#247653" strokeWidth={2.5} dot={false} name="Dissolved Oxygen (mg/L)" />
                <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#168B91" strokeWidth={2} dot={false} name="Temperature (°C)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: pH, Ammonia, Salinity */}
        <div className="space-y-2 pt-4 border-t border-[#EEF2EF]">
          <h3 className="text-xs font-bold text-[#172820] uppercase tracking-wider">
            2. pH Equilibria, Total Ammonia (TAN), and Salinity
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2EF" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: "#68776F" }} stroke="#E3EAE5" />
                <YAxis yAxisId="left" domain={[7, 9]} tick={{ fontSize: 10, fill: "#7C3AED" }} stroke="#E3EAE5" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 0.25]} tick={{ fontSize: 10, fill: "#C84040" }} stroke="#E3EAE5" />
                <Tooltip contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E3EAE5", fontSize: "12px", boxShadow: "0 4px 14px rgba(30,60,45,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line yAxisId="left" type="monotone" dataKey="ph" stroke="#7C3AED" strokeWidth={2} dot={false} name="pH Value" />
                <Line yAxisId="right" type="monotone" dataKey="ammonia" stroke="#C84040" strokeWidth={2} dot={false} name="Ammonia NH3 (mg/L)" />
                <Line yAxisId="left" type="monotone" dataKey="salinity" stroke="#21845A" strokeWidth={1.5} dot={false} name="Salinity (ppt)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Aerators & Smart Feeder Actuator Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Aerator Actuators */}
        <div className="soft-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E3EAE5] pb-3">
            <div className="flex items-center space-x-2">
              <Wind className="h-4.5 w-4.5 text-[#168B91]" />
              <h3 className="text-sm font-bold text-[#172820]">
                Pond Aerators (4 Units Installed)
              </h3>
            </div>
            <span className="badge-soft-info text-[10px] px-2 py-0.5">
              Hysteresis Guard Active
            </span>
          </div>

          <div className="space-y-2.5">
            {aerators.map((a: any) => {
              const isRunning = a.status === "RUNNING";
              return (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-[#172820]">
                        {a.name}
                      </span>
                      <span className="text-xs text-[#68776F] font-mono">
                        ({a.code})
                      </span>
                    </div>
                    <p className="text-xs text-[#68776F] mt-0.5">
                      Power: {a.power_rating_kw} kW (2HP) • Runtime: {a.runtime_hours_today} hrs ({a.total_kwh_today} kWh)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isRunning
                          ? "badge-soft-success animate-pulse"
                          : "badge-neutral"
                      }`}
                    >
                      {isRunning ? "RUNNING" : "STANDBY"}
                    </span>

                    {isRunning ? (
                      <button
                        onClick={() => triggerAeratorSafetyModal(a, "STOP")}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FDF2F2] text-[#C84040] border border-[#F7C8C8] hover:bg-[#FBE8E8] transition-colors"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerAeratorSafetyModal(a, "START")}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#247653] text-white hover:bg-[#174D39] shadow-sm transition-colors"
                      >
                        Start
                      </button>
                    )}

                    <button
                      onClick={() => triggerAeratorSafetyModal(a, "EMERGENCY_OVERRIDE")}
                      title="Emergency Override"
                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#FEF7EC] text-[#B7791F] border border-[#F6DFB3] hover:bg-[#FDF0DB] transition-colors"
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
        <div className="soft-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E3EAE5] pb-3">
            <div className="flex items-center space-x-2">
              <UtensilsCrossed className="h-4.5 w-4.5 text-[#247653]" />
              <h3 className="text-sm font-bold text-[#172820]">
                Automated Solar Feeder Actuator
              </h3>
            </div>
            <span className="badge-soft-success text-[10px] px-2 py-0.5">
              {feeder?.code || `FEEDER-P0${selectedPondId}`}
            </span>
          </div>

          {feeder && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
                  <span className="text-[#68776F] block font-medium text-[10px] uppercase">Hopper Level</span>
                  <span className="text-sm font-extrabold text-[#172820] tabular-nums mt-0.5 block">
                    {feeder.current_feed_level_kg} / {feeder.hopper_capacity_kg} kg
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
                  <span className="text-[#68776F] block font-medium text-[10px] uppercase">Dispensed Today</span>
                  <span className="text-sm font-extrabold text-[#21845A] tabular-nums mt-0.5 block">
                    {feeder.dispensed_today_kg} kg
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
                  <span className="text-[#68776F] block font-medium text-[10px] uppercase">Next Scheduled</span>
                  <span className="text-sm font-extrabold text-[#172820] mt-0.5 block">
                    {feeder.next_feeding_time}
                  </span>
                </div>
              </div>

              {/* Feeding Controls */}
              <div className="p-4 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] space-y-2.5">
                <span className="text-[11px] font-bold text-[#172820] block uppercase tracking-wider">
                  Remote Dispenser Commands
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => triggerFeederSafetyModal(feeder, "START", 2.5)}
                    className="btn-primary text-xs"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Dispense (2.5 kg)</span>
                  </button>
                  <button
                    onClick={() => triggerFeederSafetyModal(feeder, "STOP")}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FDF2F2] text-[#C84040] border border-[#F7C8C8] hover:bg-[#FBE8E8] transition-colors"
                  >
                    <Square className="h-3.5 w-3.5 inline mr-1" />
                    <span>Stop Dispenser</span>
                  </button>
                  <button
                    onClick={() => triggerFeederSafetyModal(feeder, "SCHEDULE")}
                    className="btn-secondary text-xs"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Update Schedule</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pond-specific active alerts if any */}
      {alerts.length > 0 && (
        <div className="soft-card p-5 space-y-2 border-red-200/60 bg-red-50/10">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#C84040]">
            <AlertCircle className="h-4 w-4" />
            <span className="uppercase tracking-wider">Active Alarms for Pond 0{selectedPondId} ({alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {alerts.map((al: any) => (
              <div key={al.id} className="p-3 rounded-xl bg-white border border-[#E3EAE5] text-xs space-y-1 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172820]">{al.title}</span>
                  <span className="badge-soft-danger text-[10px]">{al.severity}</span>
                </div>
                <p className="text-[11px] text-[#68776F]">{al.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hardened Actuator Safety Modal */}
      {safetyModal.isOpen && (
        <CommandSafetyModal
          isOpen={safetyModal.isOpen}
          onClose={() => setSafetyModal({ isOpen: false, type: "AERATOR", id: 0, name: "", action: "" })}
          onConfirm={handleExecuteSafetyAction}
          title={
            safetyModal.type === "AERATOR"
              ? safetyModal.action === "STOP"
                ? "Confirm Aeration Shutdown"
                : "Confirm Aerator Start"
              : safetyModal.action === "STOP"
              ? "Confirm Feeder Halt"
              : "Confirm Remote Feed Dispense"
          }
          actionDescription={`${safetyModal.action} (${safetyModal.type})`}
          equipmentName={safetyModal.name}
          equipmentType={safetyModal.type}
          currentDO={safetyModal.currentDO}
          criticalSafetyHold={
            safetyModal.type === "AERATOR" &&
            safetyModal.action === "STOP" &&
            (safetyModal.currentDO !== undefined && safetyModal.currentDO < 3.8)
          }
          criticalSafetyHoldReason={
            safetyModal.type === "AERATOR" &&
            safetyModal.action === "STOP" &&
            (safetyModal.currentDO !== undefined && safetyModal.currentDO < 3.8)
              ? `Local Edge Emergency Hypoxia Protection is running on Pond 0${selectedPondId} (DO = ${safetyModal.currentDO} mg/L < 3.8 mg/L critical threshold). Stopping aerators during active hypoxia is strictly forbidden by edge safety firmware.`
              : undefined
          }
          safetyWarnings={[
            "Industrial motor anti-short-cycle delay requires 10 minutes between consecutive starts.",
            safetyModal.action === "STOP"
              ? "Halting aerators during critical hours can cause sudden oxygen depletion."
              : "Verify water depth is at least 1.0m to prevent bottom sediment disturbance.",
          ]}
        />
      )}
    </div>
  );

};
