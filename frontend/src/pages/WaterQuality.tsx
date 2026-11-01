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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E3EAE5]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172820] tracking-tight">
            Water Quality Intelligence &amp; Telemetry Matrix
          </h1>
          <p className="text-xs text-[#68776F] font-medium mt-1">
            10-Pond Multi-Parameter Sensor Grid • Continuous RS485 Submerged Optical Probes
          </p>
        </div>

        <a
          href="http://localhost:8000/api/reports/export-csv"
          download
          className="btn-secondary text-xs"
        >
          <Download className="h-4 w-4 text-[#168B91]" />
          <span>Export Telemetry CSV</span>
        </a>
      </div>

      {/* 10-Pond Telemetry Comparison Table */}
      <div className="soft-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3EAE5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[#172820]">
              Fleet Real-Time Telemetry Matrix
            </h2>
            <p className="text-xs text-[#68776F]">
              Direct optical sensor measurements refreshed via LoRa IN865 gateways
            </p>
          </div>
          <span className="badge-soft-success text-xs px-2.5 py-0.5">
            10 Ponds Online
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EFF4F0] text-[#68776F] font-bold uppercase tracking-wider border-b border-[#E3EAE5]">
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
            <tbody className="divide-y divide-[#EEF2EF] text-[#172820] font-medium">
              {ponds.map((p) => {
                const isCritDO = p.water_quality.do < 3.8;
                const isWarnDO = p.water_quality.do < 4.8;
                const isHighAmm = p.water_quality.ammonia > 0.10;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-[#F6F8F6] transition-colors cursor-pointer"
                    onClick={() => navigateToPondDetail(p.id)}
                  >
                    <td className="py-3.5 px-4 font-bold text-[#172820]">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === "RED"
                            ? "badge-soft-critical"
                            : p.status === "YELLOW"
                            ? "badge-soft-warning"
                            : "badge-soft-success"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums">
                      <span
                        className={`font-black ${
                          isCritDO ? "text-[#C84040]" : isWarnDO ? "text-[#B7791F]" : "text-[#172820]"
                        }`}
                      >
                        {p.water_quality.do}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#172820] tabular-nums">
                      {p.water_quality.temperature}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#172820] tabular-nums">
                      {p.water_quality.ph}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums">
                      <span className={`font-bold ${isHighAmm ? "text-[#C84040]" : "text-[#172820]"}`}>
                        {p.water_quality.ammonia}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#172820] tabular-nums">
                      {p.water_quality.salinity}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#172820] tabular-nums">
                      {p.water_quality.turbidity}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[#247653] font-bold hover:underline">
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
      <div className="soft-card p-6 space-y-4">
        <div className="flex items-center space-x-2.5 pb-2 border-b border-[#E3EAE5]">
          <Info className="h-4.5 w-4.5 text-[#168B91]" />
          <div>
            <h3 className="text-sm font-extrabold text-[#172820]">
              Commercial Litopenaeus vannamei Biological Safety Standards
            </h3>
            <p className="text-xs text-[#68776F]">
              Scientific aquaculture thresholds for semi-intensive brackish water culture
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {thresholds.map((t, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] space-y-1.5 text-xs">
              <span className="font-bold text-[#172820] block text-sm">
                {t.param}
              </span>
              <div className="flex justify-between text-[#68776F]">
                <span>Optimal Range:</span>
                <span className="font-bold text-[#21845A]">{t.optimal}</span>
              </div>
              <div className="flex justify-between text-[#68776F]">
                <span>Safe Floor/Ceiling:</span>
                <span className="font-bold text-[#B7791F]">{t.safeMin}</span>
              </div>
              <div className="flex justify-between text-[#68776F]">
                <span>Critical Trigger:</span>
                <span className="font-bold text-[#C84040]">{t.critical}</span>
              </div>
              <p className="text-[11px] text-[#68776F] pt-1.5 border-t border-[#E3EAE5]/70">
                Risk: {t.impact}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

};
