import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Wind,
  UtensilsCrossed,
  Microscope,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";

export const Ponds: React.FC = () => {
  const { ponds, navigateToPondDetail } = useApp();
  const [filter, setFilter] = useState<string>("ALL");

  const filteredPonds = ponds.filter((p) => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Pond Fleet Management
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            10 Production Ponds • 1.0 Hectare Each • Semi-Intensive L. vannamei Culture
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All (10)
          </button>
          <button
            onClick={() => setFilter("GREEN")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "GREEN"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-700 hover:text-emerald-900"
            }`}
          >
            Healthy (GREEN)
          </button>
          <button
            onClick={() => setFilter("YELLOW")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "YELLOW"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-amber-700 hover:text-amber-900"
            }`}
          >
            Warning (YELLOW)
          </button>
          <button
            onClick={() => setFilter("RED")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "RED"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-rose-700 hover:text-rose-900"
            }`}
          >
            Critical (RED)
          </button>
        </div>
      </div>

      {/* Grid of Pond Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPonds.map((p) => {
          const isRed = p.status === "RED";
          const isYellow = p.status === "YELLOW";
          const isOrange = p.status === "ORANGE";

          return (
            <div
              key={p.id}
              onClick={() => navigateToPondDetail(p.id)}
              className={`bg-white rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-card hover:-translate-y-1 ${
                isRed
                  ? "border-rose-300 ring-2 ring-rose-200"
                  : isOrange
                  ? "border-orange-300 ring-2 ring-orange-200"
                  : isYellow
                  ? "border-amber-300 ring-1 ring-amber-100"
                  : "border-slate-200 hover:border-emerald-300"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-black text-slate-900">
                      {p.name}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      ({p.area_ha} Ha / 12,000 m³)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    DOC: <span className="font-bold text-slate-800">{p.current_age_days} Days</span> • Species: {p.shrimp_species}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    isRed
                      ? "bg-rose-100 text-rose-800"
                      : isOrange
                      ? "bg-orange-100 text-orange-800"
                      : isYellow
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isRed ? "RED - CRITICAL" : isOrange ? "ORANGE - HIGH RISK" : isYellow ? "YELLOW - WARNING" : "GREEN - HEALTHY"}
                </span>
              </div>

              {p.active_event && (
                <div className="my-2.5 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-800 flex items-center justify-between">
                  <span>Injected Stress Event:</span>
                  <span className="underline">{p.active_event}</span>
                </div>
              )}

              {/* Biomass & Growth Metrics */}
              <div className="grid grid-cols-2 gap-3 py-3 text-xs bg-slate-50/60 rounded-xl px-3 my-3">
                <div>
                  <span className="text-slate-500 font-semibold block">Est. Biomass</span>
                  <span className="text-base font-black text-slate-900">
                    {p.estimated_biomass_kg.toLocaleString()} kg
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Survival Rate</span>
                  <span className="text-base font-black text-emerald-700">
                    {p.survival_rate_pct}%
                  </span>
                </div>
              </div>

              {/* Water Quality Telemetry Parameters (Requirement 6) */}
              <div className="space-y-1.5 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Water Quality Sensors
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* DO */}
                  <div className="p-2 rounded-lg border border-slate-100 bg-white">
                    <span className="text-[10px] text-slate-400 block font-semibold">DO</span>
                    <span
                      className={`text-sm font-black ${
                        p.water_quality.do < 3.8
                          ? "text-rose-600"
                          : p.water_quality.do < 4.8
                          ? "text-amber-600"
                          : "text-slate-800"
                      }`}
                    >
                      {p.water_quality.do} <span className="text-[10px] font-normal text-slate-400">mg/L</span>
                    </span>
                  </div>

                  {/* Temperature */}
                  <div className="p-2 rounded-lg border border-slate-100 bg-white">
                    <span className="text-[10px] text-slate-400 block font-semibold">TEMP</span>
                    <span className="text-sm font-bold text-slate-800">
                      {p.water_quality.temperature} <span className="text-[10px] font-normal text-slate-400">°C</span>
                    </span>
                  </div>

                  {/* pH */}
                  <div className="p-2 rounded-lg border border-slate-100 bg-white">
                    <span className="text-[10px] text-slate-400 block font-semibold">pH</span>
                    <span className="text-sm font-bold text-slate-800">
                      {p.water_quality.ph}
                    </span>
                  </div>

                  {/* Ammonia */}
                  <div className="p-2 rounded-lg border border-slate-100 bg-white">
                    <span className="text-[10px] text-slate-400 block font-semibold">AMMONIA</span>
                    <span
                      className={`text-sm font-bold ${
                        p.water_quality.ammonia > 0.10 ? "text-rose-600 font-black" : "text-slate-800"
                      }`}
                    >
                      {p.water_quality.ammonia} <span className="text-[10px] font-normal text-slate-400">mg/L</span>
                    </span>
                  </div>

                  {/* Salinity */}
                  <div className="p-2 rounded-lg border border-slate-100 bg-white">
                    <span className="text-[10px] text-slate-400 block font-semibold">SALINITY</span>
                    <span className="text-sm font-bold text-slate-800">
                      {p.water_quality.salinity} <span className="text-[10px] font-normal text-slate-400">ppt</span>
                    </span>
                  </div>

                  {/* Turbidity */}
                  <div className="p-2 rounded-lg border border-slate-100 bg-white">
                    <span className="text-[10px] text-slate-400 block font-semibold">SECCHI</span>
                    <span className="text-sm font-bold text-slate-800">
                      {p.water_quality.turbidity} <span className="text-[10px] font-normal text-slate-400">cm</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Actuators & Disease Status */}
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Wind className="h-3.5 w-3.5 text-teal-600" />
                    <span>Aerators:</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {p.aerator_summary.active_count} of {p.aerator_summary.total_count} Running ({p.aerator_summary.status})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Feeder:</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {p.feeding_summary.dispensed_today_kg} kg dispensed • Next: {p.feeding_summary.next_feeding_time}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Microscope className="h-3.5 w-3.5 text-purple-600" />
                    <span>Disease Risk:</span>
                  </span>
                  <span
                    className={`font-black ${
                      p.disease_risk === "HIGH" || p.disease_risk === "CRITICAL"
                        ? "text-rose-600"
                        : p.disease_risk === "MEDIUM"
                        ? "text-amber-600"
                        : "text-emerald-700"
                    }`}
                  >
                    {p.disease_risk} ({p.disease_risk_score}%)
                  </span>
                </div>
              </div>

              {/* Action Link */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end text-xs font-bold text-teal-700 group">
                <span className="mr-1 group-hover:underline">Open Pond Telemetry & Controls</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
