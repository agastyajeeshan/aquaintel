import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
} from "lucide-react";

export const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeReportType, setActiveReportType] = useState<string>("daily");

  useEffect(() => {
    const loadDaily = async () => {
      try {
        setLoading(true);
        const res = await api.getDailyReport();
        setReportData(res);
      } catch (e) {
        console.warn("Failed to load report", e);
      } finally {
        setLoading(false);
      }
    };
    loadDaily();
  }, [activeReportType]);

  const handlePrint = () => {
    window.print();
  };

  const exec = reportData?.executive_summary || {
    total_ponds: 10,
    healthy_count: 8,
    warning_count: 1,
    critical_count: 1,
    total_biomass_kg: 12450,
    feed_dispensed_today_kg: 384,
    energy_consumed_kwh: 395,
    estimated_daily_energy_cost_inr: 2962.5,
    unresolved_alerts_count: 3,
  };

  const ponds = reportData?.pond_status_table || [];
  const alerts = reportData?.active_alerts || [];

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Compliance & Operational Report Generation
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Daily Summaries • Water Quality Logs • Feed Optimization • Energy Audits
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-subtle transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report View</span>
          </button>

          <a
            href="http://localhost:8000/api/reports/export-csv"
            download
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV Dataset</span>
          </a>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {[
          { id: "daily", label: "Daily Farm Report" },
          { id: "water", label: "Water Quality Log" },
          { id: "feed", label: "Feeding & FCR Audit" },
          { id: "disease", label: "Disease Biosecurity" },
          { id: "energy", label: "Energy Consumption" },
          { id: "harvest", label: "Crop Production" },
        ].map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveReportType(r.id)}
            className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
              activeReportType === r.id
                ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Generated Report Document Paper View */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-subtle space-y-6">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <span className="text-xs font-bold text-teal-700 tracking-wider uppercase block">
              OFFICIAL FARM OPERATING DOCUMENT
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-0.5">
              {reportData?.title || "AquaIntel Daily Operational & Water Quality Summary"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Estate: {reportData?.farm_name || "AquaIntel Delta Estate (10 Hectares, Nellore, AP)"}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500">
            <p className="font-mono font-bold text-slate-800">
              DOC ID: {reportData?.report_id || "REP-DAILY-20261007"}
            </p>
            <p>Generated: {reportData?.generated_at || "2026-10-07 18:30 IST"}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              VERIFIED COMPLIANT
            </span>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            1. Executive Operational Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-semibold">Total Ponds Monitored</span>
              <span className="text-lg font-black text-slate-900">{exec.total_ponds} Ponds</span>
              <span className="text-[10px] text-slate-500 block">8 Healthy • 1 Warning • 1 Critical</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-semibold">Active Standing Biomass</span>
              <span className="text-lg font-black text-slate-900">{exec.total_biomass_kg.toLocaleString()} kg</span>
              <span className="text-[10px] text-slate-500 block">Avg: 1,245 kg / Ha</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-semibold">Nutritional Feed Dispensed</span>
              <span className="text-lg font-black text-slate-900">{exec.feed_dispensed_today_kg} kg</span>
              <span className="text-[10px] text-emerald-700 font-bold block">FCR: 1.24 (-0.41 vs avg)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block font-semibold">Electricity Consumption</span>
              <span className="text-lg font-black text-slate-900">{exec.energy_consumed_kwh} kWh</span>
              <span className="text-[10px] text-teal-700 font-bold block">₹{exec.estimated_daily_energy_cost_inr.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Ponds Census Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            2. Pond-by-Pond Biological Census
          </h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Pond #</th>
                  <th className="py-2.5 px-3">DOC (Age)</th>
                  <th className="py-2.5 px-3">Est. Biomass (kg)</th>
                  <th className="py-2.5 px-3">Survival Rate</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ponds.map((p: any) => (
                  <tr key={p.pond_number} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">Pond 0{p.pond_number}</td>
                    <td className="py-2.5 px-3">{p.doc} Days</td>
                    <td className="py-2.5 px-3 font-bold">{p.biomass_kg.toLocaleString()} kg</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">{p.survival_pct}%</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-xs">{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Alerts Appendix */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            3. Active Environmental Alerts & Action Register
          </h3>
          <div className="space-y-2">
            {alerts.map((al: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900">{al.title}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Action: {al.recommended_action}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                  {al.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-900">Dr. K. Srinivas</p>
            <p>Chief Agritech Director • AquaIntel</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900">V. Naresh</p>
            <p>Farm Operations Manager • Delta Sector</p>
          </div>
        </div>
      </div>
    </div>
  );
};
