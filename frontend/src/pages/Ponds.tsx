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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E3EAE5]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172820] tracking-tight">
            Pond Fleet Management
          </h1>
          <p className="text-xs text-[#68776F] font-medium mt-1">
            10 Production Ponds • 1.0 Hectare Each • Semi-Intensive <span className="italic">L. vannamei</span> Culture
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-[#EFF4F0] p-1 rounded-xl border border-[#E3EAE5] text-xs font-semibold">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-all text-xs ${
              filter === "ALL"
                ? "bg-white text-[#172820] shadow-[0_1px_3px_rgba(30,60,45,0.06)] font-bold"
                : "text-[#68776F] hover:text-[#172820]"
            }`}
          >
            All (10)
          </button>
          <button
            onClick={() => setFilter("GREEN")}
            className={`px-3 py-1.5 rounded-lg transition-all text-xs ${
              filter === "GREEN"
                ? "bg-[#21845A] text-white shadow-sm font-bold"
                : "text-[#21845A] hover:bg-[#EAF6EE]"
            }`}
          >
            Healthy (8)
          </button>
          <button
            onClick={() => setFilter("YELLOW")}
            className={`px-3 py-1.5 rounded-lg transition-all text-xs ${
              filter === "YELLOW"
                ? "bg-[#B7791F] text-white shadow-sm font-bold"
                : "text-[#B7791F] hover:bg-[#FEF7EC]"
            }`}
          >
            Warning (1)
          </button>
          <button
            onClick={() => setFilter("RED")}
            className={`px-3 py-1.5 rounded-lg transition-all text-xs ${
              filter === "RED"
                ? "bg-[#C84040] text-white shadow-sm font-bold"
                : "text-[#C84040] hover:bg-[#FDF2F2]"
            }`}
          >
            Critical (1)
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
              className={`soft-card p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 ${
                isRed
                  ? "border-[#F7C8C8] bg-[#FDF2F2]/20 hover:border-[#C84040]"
                  : isOrange
                  ? "border-[#F6DFB3] bg-[#FEF7EC]/30 hover:border-[#B7791F]"
                  : isYellow
                  ? "border-[#F6DFB3] bg-[#FEF7EC]/20 hover:border-[#B7791F]"
                  : "hover:border-[#C6E7D2]"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-extrabold text-[#172820]">
                      {p.name}
                    </span>
                    <span className="text-xs text-[#68776F] font-semibold">
                      ({p.area_ha} Ha / 12,000 m³)
                    </span>
                  </div>
                  <p className="text-xs text-[#68776F] font-medium mt-0.5">
                    DOC: <span className="font-bold text-[#172820]">{p.current_age_days} Days</span> • Species: {p.shrimp_species}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isRed
                      ? "badge-soft-critical"
                      : isOrange
                      ? "badge-soft-warning"
                      : isYellow
                      ? "badge-soft-warning"
                      : "badge-soft-success"
                  }`}
                >
                  {isRed ? "CRITICAL" : isOrange ? "HIGH RISK" : isYellow ? "WARNING" : "HEALTHY"}
                </span>
              </div>

              {p.active_event && (
                <div className="my-2.5 px-2.5 py-1 bg-[#FDF2F2] border border-[#F7C8C8] rounded-xl text-xs font-bold text-[#C84040] flex items-center justify-between">
                  <span>Injected Stress:</span>
                  <span className="font-semibold underline">{p.active_event}</span>
                </div>
              )}

              {/* Biomass & Growth Metrics */}
              <div className="grid grid-cols-2 gap-3 py-2.5 text-xs bg-[#EFF4F0]/80 rounded-xl px-3.5 my-3 border border-[#E3EAE5]/60">
                <div>
                  <span className="text-[#68776F] font-medium block text-[11px]">Est. Biomass</span>
                  <span className="text-sm font-extrabold text-[#172820] tabular-nums">
                    {p.estimated_biomass_kg.toLocaleString()} kg
                  </span>
                </div>
                <div>
                  <span className="text-[#68776F] font-medium block text-[11px]">Survival Rate</span>
                  <span className="text-sm font-extrabold text-[#21845A] tabular-nums">
                    {p.survival_rate_pct}%
                  </span>
                </div>
              </div>

              {/* Water Quality Telemetry Parameters */}
              <div className="space-y-1.5 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#68776F] block">
                  Pond Sensors Snapshot
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* DO */}
                  <div className="p-2 rounded-xl border border-[#E3EAE5] bg-white">
                    <span className="text-[10px] text-[#68776F] block font-medium">DO</span>
                    <span
                      className={`text-sm font-extrabold tabular-nums ${
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

                  {/* Temperature */}
                  <div className="p-2 rounded-xl border border-[#E3EAE5] bg-white">
                    <span className="text-[10px] text-[#68776F] block font-medium">TEMP</span>
                    <span className="text-sm font-bold text-[#172820] tabular-nums">
                      {p.water_quality.temperature} <span className="text-[10px] font-normal text-[#68776F]">°C</span>
                    </span>
                  </div>

                  {/* pH */}
                  <div className="p-2 rounded-xl border border-[#E3EAE5] bg-white">
                    <span className="text-[10px] text-[#68776F] block font-medium">pH</span>
                    <span className="text-sm font-bold text-[#172820] tabular-nums">
                      {p.water_quality.ph}
                    </span>
                  </div>

                  {/* Ammonia */}
                  <div className="p-2 rounded-xl border border-[#E3EAE5] bg-white">
                    <span className="text-[10px] text-[#68776F] block font-medium">TAN / NH₃</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        p.water_quality.ammonia > 0.10 ? "text-[#C84040] font-black" : "text-[#172820]"
                      }`}
                    >
                      {p.water_quality.ammonia} <span className="text-[10px] font-normal text-[#68776F]">mg/L</span>
                    </span>
                  </div>

                  {/* Salinity */}
                  <div className="p-2 rounded-xl border border-[#E3EAE5] bg-white">
                    <span className="text-[10px] text-[#68776F] block font-medium">SALINITY</span>
                    <span className="text-sm font-bold text-[#172820] tabular-nums">
                      {p.water_quality.salinity} <span className="text-[10px] font-normal text-[#68776F]">ppt</span>
                    </span>
                  </div>

                  {/* Secchi */}
                  <div className="p-2 rounded-xl border border-[#E3EAE5] bg-white">
                    <span className="text-[10px] text-[#68776F] block font-medium">SECCHI</span>
                    <span className="text-sm font-bold text-[#172820] tabular-nums">
                      {p.water_quality.turbidity} <span className="text-[10px] font-normal text-[#68776F]">cm</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Actuators & Disease Status */}
              <div className="mt-3 pt-3 border-t border-[#EEF2EF] space-y-1.5 text-xs text-[#68776F]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Wind className="h-3.5 w-3.5 text-[#168B91]" />
                    <span>Aerators:</span>
                  </span>
                  <span className="font-bold text-[#172820] tabular-nums">
                    {p.aerator_summary.active_count} of {p.aerator_summary.total_count} Running ({p.aerator_summary.status})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-[#247653]" />
                    <span>Feeder:</span>
                  </span>
                  <span className="font-bold text-[#172820] tabular-nums">
                    {p.feeding_summary.dispensed_today_kg} kg • Next: {p.feeding_summary.next_feeding_time}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Microscope className="h-3.5 w-3.5 text-[#168B91]" />
                    <span>Disease Risk:</span>
                  </span>
                  <span
                    className={`font-black ${
                      p.disease_risk === "HIGH" || p.disease_risk === "CRITICAL"
                        ? "text-[#C84040]"
                        : p.disease_risk === "MEDIUM"
                        ? "text-[#B7791F]"
                        : "text-[#21845A]"
                    }`}
                  >
                    {p.disease_risk} ({p.disease_risk_score}%)
                  </span>
                </div>
              </div>

              {/* Action Link */}
              <div className="mt-3.5 pt-2.5 border-t border-[#E3EAE5] flex items-center justify-end text-xs font-bold text-[#247653] group">
                <span className="mr-1 group-hover:underline">Open Pond Diagnostics</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-[#247653]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

};
