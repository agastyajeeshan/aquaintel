import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  UtensilsCrossed,
  ShieldAlert,
  Play,
  Square,
  Clock,
  Sliders,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Zap,
} from "lucide-react";

export const Feeding: React.FC = () => {
  const { ponds } = useApp();
  const [feedingData, setFeedingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string>("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getFeedingStatus();
      setFeedingData(res);
    } catch (e) {
      console.warn("Failed to load feeding status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleControl = async (feederId: number, action: string) => {
    try {
      const res = await api.controlFeeder(feederId, action, 2.5);
      setActionMsg(res.message);
      loadData();
      setTimeout(() => setActionMsg(""), 4000);
    } catch (e: any) {
      setActionMsg("Feeder error: " + e.message);
    }
  };

  const summary = feedingData?.summary || {
    today_feed_kg: 384.0,
    recommended_feed_kg: 412.0,
    feed_consumed_kg: 368.6,
    feed_remaining_kg: 43.4,
    fcr: 1.24,
    feeding_efficiency_pct: 94.2,
  };

  const feeders = feedingData?.feeders || [];
  const recentLogs = feedingData?.recent_logs || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Smart Feeding Engine & Feeder Actuators
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Biomass-Driven Nutritional Modeling • DO & Temperature Environmental Safety Interlocks
          </p>
        </div>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
          Automated Acoustic & Timer Feeders
        </span>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 shadow-subtle animate-pulse">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* 1. Feed KPI Summary (Requirement 10) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Today's Feed
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary.today_feed_kg} <span className="text-xs font-normal text-slate-500">kg</span>
          </p>
          <span className="text-[10px] text-slate-500">10 Ponds Aggregate</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Recommended
          </span>
          <p className="text-2xl font-black text-teal-700 mt-1">
            {summary.recommended_feed_kg} <span className="text-xs font-normal text-slate-500">kg</span>
          </p>
          <span className="text-[10px] text-slate-500">Biomass Algorithm</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Feed Consumed
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {summary.feed_consumed_kg} <span className="text-xs font-normal text-slate-500">kg</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">96% ingestion</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Feed Remaining
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary.feed_remaining_kg} <span className="text-xs font-normal text-slate-500">kg</span>
          </p>
          <span className="text-[10px] text-slate-500">Pending evening cycle</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Current FCR
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary.fcr}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">Benchmark: 1.65 (Saved 0.41)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Feed Efficiency
          </span>
          <p className="text-2xl font-black text-teal-700 mt-1">
            {summary.feeding_efficiency_pct}%
          </p>
          <span className="text-[10px] text-slate-500">Minimal benthic sludge</span>
        </div>
      </div>

      {/* 2. Smart Feeding Safety Explanation Card (Requirement 11) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-black text-slate-900">
              Why Was Feeding Adjusted / Reduced Today?
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Explainable Environmental Safety Rules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-rose-900">
              <span>Pond 08: 100% Safety Stop</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">HALTED</span>
            </div>
            <p className="text-xs text-rose-700">
              Recommended: 48 kg &rarr; Actual: 0 kg dispensed.
            </p>
            <p className="text-xs text-rose-800 font-medium">
              <strong>Reason:</strong> DO dropped to 3.4 mg/L (&lt; 3.8 mg/L safety cutoff) + ammonia elevated. Dispensing feed during hypoxia causes severe shrimp mortality and toxic sludge.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-amber-900">
              <span>Pond 04: Feed Reduced by 25%</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">CUT 25%</span>
            </div>
            <p className="text-xs text-amber-700">
              Recommended: 42 kg &rarr; Actual: 31.5 kg dispensed.
            </p>
            <p className="text-xs text-amber-800 font-medium">
              <strong>Reason:</strong> Water temperature peaked at 32.8°C at 14:00. High heat reduces shrimp gastric motility; feed was scaled down to prevent uneaten waste.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-emerald-900">
              <span>Ponds 01, 02, 03, 05, 06, 07, 09, 10: 100% Rate</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">OPTIMAL</span>
            </div>
            <p className="text-xs text-emerald-700">
              Dispensing 100% planned nutritional ration.
            </p>
            <p className="text-xs text-emerald-800 font-medium">
              <strong>Reason:</strong> Dissolved oxygen stable (&gt; 5.8 mg/L), water temperature between 28-30°C, clean check-tray observations.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Feeder Actuator Fleet Grid (Requirement 12) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Automated Feeder Fleet Controls (10 Units)
            </h2>
            <p className="text-xs text-slate-500">
              Control solar feeder dispensers, adjust quotas, and override schedules
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {feeders.map((f: any) => {
            const isStopped = f.status === "STOPPED" || f.status === "ERROR";
            return (
              <div
                key={f.id}
                className={`p-4 rounded-xl border transition-all ${
                  isStopped
                    ? "border-rose-200 bg-rose-50/30"
                    : "border-slate-200 bg-white hover:border-teal-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-900">
                    {f.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isStopped
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {f.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 mb-3">
                  <div className="flex justify-between">
                    <span>Hopper:</span>
                    <span className="font-bold text-slate-800">{f.current_feed_level_kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Today:</span>
                    <span className="font-bold text-teal-700">{f.dispensed_today_kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next:</span>
                    <span className="font-medium text-slate-800">{f.next_feeding_time}</span>
                  </div>
                </div>

                {/* Actuator Action Buttons */}
                <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleControl(f.id, "START")}
                    disabled={isStopped}
                    className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors text-center"
                  >
                    Dispense
                  </button>
                  <button
                    onClick={() => handleControl(f.id, "STOP")}
                    className="py-1.5 px-2 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Stop
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
