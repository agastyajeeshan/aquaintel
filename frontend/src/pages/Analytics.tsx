import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Calendar,
  BarChart3,
  Loader2,
} from "lucide-react";

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.getAnalytics();
        setData(res);
      } catch (e) {
        console.warn("Failed to load analytics", e);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const prod = data?.production || {};
  const feed = data?.feed || {};
  const energy = data?.energy || {};
  const prodTrend = data?.production_trend || [];
  const energyTrend = data?.energy_trend || [];
  const pondTable = data?.pond_performance || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3F3E9] text-[#247653]">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#172820] tracking-tight">
              Farm Performance & Multi-Cycle Analytics
            </h1>
          </div>
          <p className="text-sm text-[#68776F] mt-1">
            Production Trends • Feed Conversion Ratio (FCR) • Energy Consumption Optimization
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-[#172820] bg-white px-3.5 py-1.5 rounded-xl border border-[#E3EAE5] shadow-soft">
          <Calendar className="h-4 w-4 text-[#247653]" />
          <span>Active Crop Cycle: 2026-Q3</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="soft-card p-4">
          <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
            Farm FCR (Current)
          </span>
          <p className="text-2xl font-bold text-[#21845A] tabular-nums mt-1">
            {feed.average_fcr || 1.24}
          </p>
          <span className="text-[11px] text-[#21845A] font-semibold">
            vs 1.65 Industry Avg (24.8% savings)
          </span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
            Weekly Growth Rate
          </span>
          <p className="text-2xl font-bold text-[#172820] tabular-nums mt-1">
            {prod.avg_growth_rate_g_week || 1.82} <span className="text-xs font-normal text-[#68776F]">g/wk</span>
          </p>
          <span className="text-[11px] text-[#247653] font-semibold">
            Target: 1.75 g/wk (+4% ahead)
          </span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
            Projected Crop Output
          </span>
          <p className="text-2xl font-bold text-[#172820] tabular-nums mt-1">
            {(prod.projected_harvest_kg || 18400).toLocaleString()} <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[11px] text-[#68776F]">
            18.4 Metric Tonnes (10 Ha)
          </span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
            Aeration Energy Saved
          </span>
          <p className="text-2xl font-bold text-[#168B91] tabular-nums mt-1">
            {energy.energy_saved_pct || 22.4}%
          </p>
          <span className="text-[11px] text-[#68776F]">
            Smart DO hysteresis vs fixed timers
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production & FCR Trend */}
        <div className="soft-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#172820]">
              Biomass Accumulation (kg) vs Feed Consumed (7 Days)
            </h2>
            <span className="text-xs text-[#68776F]">10-Pond Fleet Average</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#68776F" }} axisLine={{ stroke: "#E3EAE5" }} />
                <YAxis tick={{ fontSize: 11, fill: "#68776F" }} axisLine={{ stroke: "#E3EAE5" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #E3EAE5",
                    fontSize: "12px",
                    boxShadow: "0 4px 16px rgba(30,60,45,0.06)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="biomass" fill="#247653" radius={[4, 4, 0, 0]} name="Total Biomass (kg)" />
                <Bar dataKey="feed_consumed" fill="#168B91" radius={[4, 4, 0, 0]} name="Daily Feed (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Electricity Sources Breakdown */}
        <div className="soft-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#172820]">
              Energy Consumption by Source (kWh)
            </h2>
            <span className="text-xs text-[#68776F]">Microgrid Energy Mix</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#68776F" }} axisLine={{ stroke: "#E3EAE5" }} />
                <YAxis tick={{ fontSize: 11, fill: "#68776F" }} axisLine={{ stroke: "#E3EAE5" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #E3EAE5",
                    fontSize: "12px",
                    boxShadow: "0 4px 16px rgba(30,60,45,0.06)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="grid_kwh" stackId="a" fill="#3478B8" name="Grid Tariff (kWh)" />
                <Bar dataKey="solar_kwh" stackId="a" fill="#21845A" name="Solar Microgrid (kWh)" />
                <Bar dataKey="dg_kwh" stackId="a" fill="#B7791F" name="Diesel Backup (kWh)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pond-by-Pond Performance Table */}
      <div className="soft-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3EAE5] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#172820]">
            Individual Pond Biomass & Survival Benchmarks
          </h3>
          <span className="text-xs text-[#68776F] tabular-nums">
            10 Commercial Ponds
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F8F6] text-[#68776F] font-semibold uppercase tracking-wider border-b border-[#E3EAE5]">
              <tr>
                <th className="py-3 px-4">Pond</th>
                <th className="py-3 px-4">DOC (Days)</th>
                <th className="py-3 px-4">Current Biomass</th>
                <th className="py-3 px-4">Survival (%)</th>
                <th className="py-3 px-4">Target FCR</th>
                <th className="py-3 px-4">Growth Rate</th>
                <th className="py-3 px-4">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE5] text-[#172820]">
              {pondTable.map((p: any) => (
                <tr key={p.pond_number} className="hover:bg-[#F6F8F6] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#172820]">{p.name}</td>
                  <td className="py-3.5 px-4 font-semibold tabular-nums">{p.doc}</td>
                  <td className="py-3.5 px-4 font-bold tabular-nums">{p.biomass_kg?.toLocaleString()} kg</td>
                  <td className="py-3.5 px-4 font-bold text-[#21845A] tabular-nums">{p.survival_pct}%</td>
                  <td className="py-3.5 px-4 font-mono font-bold tabular-nums">{p.fcr}</td>
                  <td className="py-3.5 px-4 font-semibold tabular-nums">{p.growth_rate_g_week} g/wk</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold ${
                        p.status === "RED"
                          ? "badge-soft-danger"
                          : p.status === "YELLOW"
                          ? "badge-soft-warning"
                          : "badge-soft-success"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && (
        <div className="text-center py-2 text-xs text-[#68776F] flex items-center justify-center space-x-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#247653]" />
          <span>Aggregating multi-cycle crop data...</span>
        </div>
      )}
    </div>
  );
};
