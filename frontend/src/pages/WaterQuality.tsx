import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Activity,
  Droplets,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
  Download,
  Info,
} from "lucide-react";

export const WaterQuality: React.FC = () => {
  const { ponds, navigateToPondDetail } = useApp();
  const [selectedParam, setSelectedParam] = useState<string>("all");

  const thresholds = [
    { param: "Dissolved Oxygen (DO)", optimal: "5.0 – 7.5 mg/L", safeMin: "4.0 mg/L", critical: "< 3.5 mg/L", impact: "Hypoxia, shrimp asphyxiation, immune collapse" },
    { param: "Water Temperature", optimal: "28.0 – 31.0 °C", safeMin: "26.0 °C", critical: "< 24°C or > 34°C", impact: "Cold thermal shock or metabolic overheating" },
    { param: "pH Level", optimal: "7.8 – 8.3", safeMin: "7.5", critical: "< 7.2 or > 8.8", impact: "Acidosis, exoskeleton softening, alkaline stress" },
    { param: "Unionized Ammonia (TAN)", optimal: "0.00 – 0.05 mg/L", safeMin: "0.08 mg/L", critical: "> 0.12 mg/L", impact: "Gill gill lamellae burning, mortality" },
    { param: "Salinity", optimal: "16.0 – 24.0 ppt", safeMin: "10.0 ppt", critical: "< 8 or > 32 ppt", impact: "Osmotic disruption and molting failure" },
    { param: "Turbidity (Secchi Disk)", optimal: "30.0 – 40.0 cm", safeMin: "25.0 cm", critical: "< 20 or > 50 cm", impact: "Phytoplankton crash or excessive bloom" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Water Quality Intelligence & Telemetry Matrix
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            10-Pond Multi-Parameter Sensor Grid • Continuous RS485 Optical Probes
          </p>
        </div>

        <a
          href="http://localhost:8000/api/reports/export-csv"
          download
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-subtle"
        >
          <Download className="h-4 w-4" />
          <span>Export Water Quality CSV</span>
        </a>
      </div>

      {/* 10-Pond Telemetry Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Fleet Real-Time Sensor Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Live updates streamed via edge telemetry gateways
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200">
            10 Ponds Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Pond</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">DO (mg/L)</th>
                <th className="py-3 px-4">Temp (°C)</th>
                <th className="py-3 px-4">pH</th>
                <th className="py-3 px-4">Ammonia (mg/L)</th>
                <th className="py-3 px-4">Salinity (ppt)</th>
                <th className="py-3 px-4">Secchi (cm)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {ponds.map((p) => {
                const isCritDO = p.water_quality.do < 3.8;
                const isWarnDO = p.water_quality.do < 4.8;
                const isHighAmm = p.water_quality.ammonia > 0.10;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => navigateToPondDetail(p.id)}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-black ${
                          isCritDO ? "text-rose-600 font-extrabold" : isWarnDO ? "text-amber-600" : "text-slate-900"
                        }`}
                      >
                        {p.water_quality.do}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {p.water_quality.temperature}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {p.water_quality.ph}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${isHighAmm ? "text-rose-600 font-black" : "text-slate-800"}`}>
                        {p.water_quality.ammonia}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {p.water_quality.salinity}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {p.water_quality.turbidity}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-teal-700 font-bold hover:underline">
                        Details &rarr;
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Biological Threshold Reference Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Info className="h-5 w-5 text-teal-600" />
          <h3 className="text-base font-bold text-slate-900">
            Commercial Litopenaeus vannamei Biological Safety Standards
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {thresholds.map((t, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5 text-xs">
              <span className="font-bold text-slate-900 block text-sm">
                {t.param}
              </span>
              <div className="flex justify-between text-slate-600">
                <span>Optimal Range:</span>
                <span className="font-bold text-emerald-700">{t.optimal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Safe Floor/Ceiling:</span>
                <span className="font-bold text-amber-700">{t.safeMin}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Critical Trigger:</span>
                <span className="font-bold text-rose-700">{t.critical}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                Risk: {t.impact}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
