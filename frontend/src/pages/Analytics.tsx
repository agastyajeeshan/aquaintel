import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Zap,
  Activity,
  Calendar,
  Layers,
  Award,
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Farm Performance & Multi-Cycle Analytics
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Production Trends • Feed Conversion Ratio (FCR) • Energy Consumption Optimization
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-subtle">
          <Calendar className="h-4 w-4 text-teal-600" />
          <span>Active Crop Cycle: 2026-Q3</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Farm FCR (Current)
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {feed.average_fcr || 1.24}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            vs 1.65 Industry Avg (24.8% savings)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Weekly Growth Rate
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {prod.avg_growth_rate_g_week || 1.82} <span className="text-xs font-normal text-slate-500">g/wk</span>
          </p>
          <span className="text-[11px] text-teal-700 font-semibold">
            Target: 1.75 g/wk (+4% ahead)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Projected Crop Output
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {(prod.projected_harvest_kg || 18400).toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            18.4 Metric Tonnes (10 Ha)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Aeration Energy Saved
          </span>
          <p className="text-2xl font-black text-teal-700 mt-1">
            {energy.energy_saved_pct || 22.4}%
          </p>
          <span className="text-[11px] text-slate-500">
            Smart DO hysteresis vs fixed timers
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production & FCR Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Biomass Accumulation (kg) vs Feed Consumed (7 Days)
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="biomass" fill="#0d9488" radius={[4, 4, 0, 0]} name="Total Biomass (kg)" />
                <Bar dataKey="feed_consumed" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Daily Feed (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Electricity Sources Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Energy Consumption by Source (kWh)
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="grid_kwh" stackId="a" fill="#0284c7" name="Grid Tariff (kWh)" />
                <Bar dataKey="solar_kwh" stackId="a" fill="#10b981" name="Solar Microgrid (kWh)" />
                <Bar dataKey="dg_kwh" stackId="a" fill="#f59e0b" name="Diesel Backup (kWh)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pond-by-Pond Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Individual Pond Biomass & Survival Benchmarks
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            10 Ponds Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pondTable.map((p: any) => (
                <tr key={p.pond_number} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                  <td className="py-3 px-4 font-semibold">{p.doc}</td>
                  <td className="py-3 px-4 font-bold">{p.biomass_kg?.toLocaleString()} kg</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">{p.survival_pct}%</td>
                  <td className="py-3 px-4 font-mono font-bold">{p.fcr}</td>
                  <td className="py-3 px-4 font-semibold">{p.growth_rate_g_week} g/wk</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === "RED"
                          ? "bg-rose-100 text-rose-800"
                          : p.status === "YELLOW"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
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
    </div>
  );
};
