import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  Wind,
  Zap,
  ShieldCheck,
  AlertOctagon,
  Clock,
  Play,
  Square,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
} from "lucide-react";

export const Aeration: React.FC = () => {
  const [aerationData, setAerationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<string>("");
  const [filterPond, setFilterPond] = useState<number>(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getAerationStatus();
      setAerationData(res);
    } catch (e) {
      console.warn("Failed to load aeration status", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleControl = async (aeratorId: number, action: string) => {
    try {
      const res = await api.controlAerator(aeratorId, action);
      setMsg(res.message);
      loadData();
      setTimeout(() => setMsg(""), 4000);
    } catch (e: any) {
      setMsg("Actuation error: " + e.message);
    }
  };

  const summary = aerationData?.summary || {
    total_aerators: 40,
    active_aerators: 12,
    standby_aerators: 28,
    total_kwh_today: 395.0,
    total_cost_inr: 2962.5,
    hysteresis_window_minutes: 10,
  };

  const aerators = aerationData?.aerators || [];
  const recentEvents = aerationData?.recent_events || [];

  const filteredAerators = filterPond === 0
    ? aerators
    : aerators.filter((a: any) => a.pond_id === filterPond);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Automated Aeration & Power Management
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Smart DO Hysteresis Algorithm • 40 Industrial Paddlewheel & Spiral Jet Actuators
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
            Anti-Short-Cycle Hysteresis (10 Min) Active
          </span>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 shadow-subtle animate-pulse">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* 1. Aeration KPI Summary (Requirement 13) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Aerators
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary.total_aerators}
          </p>
          <span className="text-[10px] text-slate-500">4 Units / Pond (10 Ponds)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-subtle">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Active Aerators
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {summary.active_aerators}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">Generating Circulation</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Standby Aerators
          </span>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {summary.standby_aerators}
          </p>
          <span className="text-[10px] text-slate-500">Energy saving state</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Power Today
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary.total_kwh_today} <span className="text-xs font-normal text-slate-500">kWh</span>
          </p>
          <span className="text-[10px] text-slate-500">24% saved vs timer</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Energy Cost
          </span>
          <p className="text-2xl font-black text-teal-700 mt-1">
            ₹{summary.total_cost_inr.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500">Commercial Agri Tariff</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Hysteresis Window
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            10 <span className="text-xs font-normal text-slate-500">min</span>
          </p>
          <span className="text-[10px] text-slate-500">VFD & motor protection</span>
        </div>
      </div>

      {/* 2. Smart Aeration Algorithm Logic Banner (Requirement 14) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-black text-slate-900">
              Smart Aeration Multi-Stage Hysteresis Algorithm
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Hysteresis Band: ±0.4 mg/L Deadband
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <span className="font-bold text-emerald-900 block">STAGE 1: SATURATED / STANDBY</span>
            <p className="font-semibold text-emerald-700 mt-1">DO &ge; 6.8 mg/L</p>
            <p className="text-slate-600 mt-1 text-[11px]">
              Switches to standby after 10-minute minimum ON time to conserve electricity.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50">
            <span className="font-bold text-teal-900 block">STAGE 2: MAINTENANCE</span>
            <p className="font-semibold text-teal-700 mt-1">DO &lt; 5.8 mg/L</p>
            <p className="text-slate-600 mt-1 text-[11px]">
              Engages primary 4-arm paddlewheel aerator for continuous circulation.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
            <span className="font-bold text-amber-900 block">STAGE 3: BOOST STAGE</span>
            <p className="font-semibold text-amber-700 mt-1">DO &lt; 4.8 mg/L</p>
            <p className="text-slate-600 mt-1 text-[11px]">
              Activates secondary paddlewheel + spiral aerators to counteract rapid drop.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
            <span className="font-bold text-rose-900 block">STAGE 4: EMERGENCY CASCADE</span>
            <p className="font-semibold text-rose-700 mt-1">DO &lt; 3.8 mg/L</p>
            <p className="text-slate-600 mt-1 text-[11px]">
              Full emergency override. All 4 aerators engaged continuously. SMS alert dispatched.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Aerators Fleet Grid with Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Aerator Actuator Interface & State Machine
            </h2>
            <p className="text-xs text-slate-500">
              Showing real-time reason for each aerator state
            </p>
          </div>

          {/* Pond filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-500">FILTER BY POND:</span>
            <select
              value={filterPond}
              onChange={(e) => setFilterPond(Number(e.target.value))}
              className="py-1.5 px-3 rounded-lg border border-slate-200 font-bold text-slate-800 bg-slate-50"
            >
              <option value={0}>All 10 Ponds (40 Aerators)</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>Pond 0{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAerators.map((a: any) => {
            const isRunning = a.status === "RUNNING";
            return (
              <div
                key={a.id}
                className={`p-4 rounded-xl border transition-all ${
                  isRunning
                    ? "border-teal-300 bg-teal-50/20 shadow-subtle"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-900">
                    {a.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isRunning
                        ? "bg-teal-100 text-teal-800 animate-pulse"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 mb-2">
                  <div className="flex justify-between">
                    <span>Pond / Code:</span>
                    <span className="font-bold text-slate-800">Pond 0{a.pond_id} • {a.aerator_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pond DO:</span>
                    <span className={`font-bold ${a.pond_do < 4.0 ? "text-rose-600" : "text-slate-800"}`}>
                      {a.pond_do} mg/L
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Power / Type:</span>
                    <span className="font-semibold text-slate-800">{a.power_rating_kw} kW • {a.aerator_type}</span>
                  </div>
                </div>

                {/* Algorithmic Reason Box (Requirement 14) */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 mb-3 min-h-[44px]">
                  <span className="font-bold text-slate-700 block">Why this state?</span>
                  <span className="line-clamp-2">{a.reason || "Maintaining normal scheduled circulation."}</span>
                </div>

                {/* Actuator Controls */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleControl(a.id, "START")}
                    className="py-1 px-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 text-center"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => handleControl(a.id, "STOP")}
                    className="py-1 px-1.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-center"
                  >
                    Stop
                  </button>
                  <button
                    onClick={() => handleControl(a.id, "EMERGENCY_OVERRIDE")}
                    className="py-1 px-1.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-center"
                  >
                    Override
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
