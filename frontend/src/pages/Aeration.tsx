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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E3EAE5]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172820] tracking-tight">
            Automated Aeration &amp; Power Management
          </h1>
          <p className="text-xs text-[#68776F] font-medium mt-1">
            Smart DO Hysteresis Algorithm • 40 Industrial Paddlewheel &amp; Spiral Jet Actuators
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="badge-soft-info text-xs px-3 py-1 font-bold">
            Anti-Short-Cycle Hysteresis (10 Min) Active
          </span>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-[#EAF6EE] border border-[#C6E7D2] text-[#21845A] text-xs font-bold flex items-center space-x-2 shadow-[0_2px_8px_rgba(33,132,90,0.08)] animate-pulse">
          <CheckCircle className="h-4 w-4 text-[#21845A] shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* 1. Aeration KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Total Aerators
          </span>
          <p className="text-2xl font-black text-[#172820] mt-1 tabular-nums">
            {summary.total_aerators}
          </p>
          <span className="text-[10px] text-[#68776F]">4 Units / Pond (10 Ponds)</span>
        </div>

        <div className="soft-card p-4 bg-[#EAF6EE]/30 border-[#C6E7D2]/80">
          <span className="text-[10px] font-bold text-[#21845A] uppercase tracking-wider block">
            Active Aerators
          </span>
          <p className="text-2xl font-black text-[#21845A] mt-1 tabular-nums">
            {summary.active_aerators}
          </p>
          <span className="text-[10px] text-[#21845A] font-semibold">Generating Circulation</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Standby Units
          </span>
          <p className="text-2xl font-black text-[#172820] mt-1 tabular-nums">
            {summary.standby_aerators}
          </p>
          <span className="text-[10px] text-[#68776F]">Energy conservation</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Power Today
          </span>
          <p className="text-2xl font-black text-[#172820] mt-1 tabular-nums">
            {summary.total_kwh_today} <span className="text-xs font-normal text-[#68776F]">kWh</span>
          </p>
          <span className="text-[10px] text-[#21845A] font-semibold">24% saved vs timer</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Energy Cost
          </span>
          <p className="text-2xl font-black text-[#168B91] mt-1 tabular-nums">
            ₹{summary.total_cost_inr.toLocaleString()}
          </p>
          <span className="text-[10px] text-[#68776F]">@₹7.50 / Unit Tariff</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Hysteresis Guard
          </span>
          <p className="text-2xl font-black text-[#172820] mt-1 tabular-nums">
            10 <span className="text-xs font-normal text-[#68776F]">min</span>
          </p>
          <span className="text-[10px] text-[#68776F]">Motor &amp; VFD protection</span>
        </div>
      </div>

      {/* 2. Smart Aeration Algorithm Logic Banner */}
      <div className="soft-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="h-4.5 w-4.5 text-[#247653]" />
            <h2 className="text-sm font-extrabold text-[#172820]">
              Automated Aeration Multi-Stage Hysteresis Algorithm
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#68776F]">
            Hysteresis Deadband: ±0.4 mg/L
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl border border-[#C6E7D2] bg-[#EAF6EE]/50">
            <span className="font-bold text-[#21845A] block text-[11px]">STAGE 1: SATURATED / STANDBY</span>
            <p className="font-extrabold text-[#21845A] text-sm mt-1 tabular-nums">DO &ge; 6.8 mg/L</p>
            <p className="text-[#68776F] mt-1 text-[11px] leading-relaxed">
              Switches to standby after 10-minute minimum ON time to conserve electricity.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#C3DCF1] bg-[#EFF6FB]/50">
            <span className="font-bold text-[#3478B8] block text-[11px]">STAGE 2: MAINTENANCE</span>
            <p className="font-extrabold text-[#3478B8] text-sm mt-1 tabular-nums">DO &lt; 5.8 mg/L</p>
            <p className="text-[#68776F] mt-1 text-[11px] leading-relaxed">
              Engages primary 4-arm paddlewheel aerator for continuous circulation.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#F6DFB3] bg-[#FEF7EC]/50">
            <span className="font-bold text-[#B7791F] block text-[11px]">STAGE 3: BOOST STAGE</span>
            <p className="font-extrabold text-[#B7791F] text-sm mt-1 tabular-nums">DO &lt; 4.8 mg/L</p>
            <p className="text-[#68776F] mt-1 text-[11px] leading-relaxed">
              Activates secondary paddlewheels + spiral jet aerators to arrest rapid oxygen decay.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#F7C8C8] bg-[#FDF2F2]/50">
            <span className="font-bold text-[#C84040] block text-[11px]">STAGE 4: EMERGENCY CASCADE</span>
            <p className="font-extrabold text-[#C84040] text-sm mt-1 tabular-nums">DO &lt; 3.8 mg/L</p>
            <p className="text-[#68776F] mt-1 text-[11px] leading-relaxed">
              Full emergency override. All 4 aerators engaged continuously. SMS alert dispatched.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Aerators Fleet Grid with Filter */}
      <div className="soft-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#E3EAE5] gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-[#172820]">
              Aerator Actuator Interface &amp; State Machine
            </h2>
            <p className="text-xs text-[#68776F]">
              Showing real-time reason for each actuator state
            </p>
          </div>

          {/* Pond filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-semibold text-[#68776F]">FILTER BY POND:</span>
            <select
              value={filterPond}
              onChange={(e) => setFilterPond(Number(e.target.value))}
              className="soft-input py-1 px-3 font-semibold text-xs text-[#172820]"
            >
              <option value={0}>All 10 Ponds (40 Aerators)</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>Pond 0{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredAerators.map((a: any) => {
            const isRunning = a.status === "RUNNING";
            return (
              <div
                key={a.id}
                className={`p-4 rounded-xl border transition-all ${
                  isRunning
                    ? "border-[#C6E7D2] bg-[#EAF6EE]/20 shadow-sm"
                    : "border-[#E3EAE5] bg-white"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#172820]">
                    {a.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isRunning
                        ? "badge-soft-success animate-pulse"
                        : "badge-neutral"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-[#68776F] mb-2">
                  <div className="flex justify-between">
                    <span>Pond / Code:</span>
                    <span className="font-semibold text-[#172820]">Pond 0{a.pond_id} • {a.aerator_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pond DO:</span>
                    <span className={`font-bold tabular-nums ${a.pond_do < 4.0 ? "text-[#C84040]" : "text-[#172820]"}`}>
                      {a.pond_do} mg/L
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Power / Type:</span>
                    <span className="font-medium text-[#172820]">{a.power_rating_kw} kW • {a.aerator_type}</span>
                  </div>
                </div>

                {/* Algorithmic Reason Box */}
                <div className="p-2.5 rounded-lg bg-[#EFF4F0] border border-[#E3EAE5]/70 text-[11px] text-[#68776F] mb-3 min-h-[46px]">
                  <span className="font-semibold text-[#172820] block text-[10px] uppercase">State Rationale</span>
                  <span className="line-clamp-2">{a.reason || "Maintaining normal scheduled circulation."}</span>
                </div>

                {/* Actuator Controls */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#EEF2EF]">
                  <button
                    onClick={() => handleControl(a.id, "START")}
                    className="py-1 px-1.5 rounded-lg text-[10px] font-semibold bg-[#247653] text-white hover:bg-[#174D39] text-center transition-colors"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => handleControl(a.id, "STOP")}
                    className="py-1 px-1.5 rounded-lg text-[10px] font-semibold bg-[#FDF2F2] text-[#C84040] border border-[#F7C8C8] hover:bg-[#FBE8E8] text-center transition-colors"
                  >
                    Stop
                  </button>
                  <button
                    onClick={() => handleControl(a.id, "EMERGENCY_OVERRIDE")}
                    className="py-1 px-1.5 rounded-lg text-[10px] font-semibold bg-[#FEF7EC] text-[#B7791F] border border-[#F6DFB3] hover:bg-[#FDF0DB] text-center transition-colors"
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
