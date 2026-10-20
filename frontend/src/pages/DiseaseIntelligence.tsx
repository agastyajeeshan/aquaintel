import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  Microscope,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  TrendingUp,
  Sliders,
  ChevronRight,
  Flame,
  Droplets,
} from "lucide-react";

export const DiseaseIntelligence: React.FC = () => {
  const { ponds } = useApp();
  const [risksData, setRisksData] = useState<any[]>([]);
  const [selectedPondId, setSelectedPondId] = useState<number>(8); // Pond 8 has elevated risk for demo
  const [loading, setLoading] = useState<boolean>(true);

  // Interactive Custom Risk Simulator state
  const [simDisease, setSimDisease] = useState<string>("WSSV");
  const [simDO, setSimDO] = useState<number>(3.4);
  const [simTemp, setSimTemp] = useState<number>(26.5);
  const [simAmmonia, setSimAmmonia] = useState<number>(0.12);
  const [simFeedDrop, setSimFeedDrop] = useState<number>(35);
  const [simResult, setSimResult] = useState<any>(null);

  const loadRisks = async () => {
    try {
      setLoading(true);
      const res = await api.getDiseaseRisks();
      setRisksData(res);
    } catch (e) {
      console.warn("Failed to load disease risks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRisks();
  }, []);

  const runCustomEvaluation = async () => {
    try {
      const res = await api.calculateFeeding ? await (await fetch(`http://localhost:8000/api/disease/evaluate?disease_key=${simDisease}&do_mg_l=${simDO}&temp_c=${simTemp}&ammonia_mg_l=${simAmmonia}&feeding_reduction_pct=${simFeedDrop}`, { method: "POST" })).json() : null;
      setSimResult(res);
    } catch (e) {
      console.warn("Failed custom evaluation", e);
    }
  };

  useEffect(() => {
    runCustomEvaluation();
  }, [simDisease, simDO, simTemp, simAmmonia, simFeedDrop]);

  const selectedPondRisk = risksData.find((r) => r.pond_id === selectedPondId) || risksData[0];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            AI-Based Disease Risk Intelligence & Biosecurity
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Explainable Epidemiological Risk Modeling for Litopenaeus vannamei
          </p>
        </div>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
          White Spot (WSSV) • Vibriosis • EMS/AHPND
        </span>
      </div>

      {/* Mandatory Clinical Disclaimer (Requirement 15 & 16) */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3 shadow-subtle">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">
            IMPORTANT SCIENTIFIC & VETERINARY NOTICE:
          </p>
          <p className="text-amber-800 mt-0.5 leading-relaxed">
            AquaIntel provides AI-based mathematical disease <strong>RISK PREDICTION ONLY</strong> based on ambient water parameters, diurnal thermal fluctuations, and behavioral feeding indices. It does NOT provide clinical or laboratory diagnosis. Definitive confirmation requires laboratory PCR molecular assays or microbiological culture.
          </p>
        </div>
      </div>

      {/* Pond Selector */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <span className="text-xs font-bold text-slate-500 shrink-0">SELECT POND:</span>
        {ponds.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPondId(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
              selectedPondId === p.id
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {p.name} {p.status === "RED" && "⚠️"}
          </button>
        ))}
      </div>

      {/* Selected Pond Detailed Pathogen Breakdown */}
      {selectedPondRisk && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">
              Pathogen Risk Profile for {selectedPondRisk.pond_name} (DOC {selectedPondRisk.doc})
            </h2>
            <span className="text-xs font-medium text-slate-500">
              Live DO: {selectedPondRisk.live_metrics.do} mg/L • Temp: {selectedPondRisk.live_metrics.temperature}°C • Ammonia: {selectedPondRisk.live_metrics.ammonia} mg/L
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {selectedPondRisk.predictions.map((pred: any, idx: number) => {
              const isHigh = pred.risk_level === "HIGH" || pred.risk_level === "CRITICAL";
              const isMed = pred.risk_level === "MEDIUM";

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border p-5 shadow-subtle flex flex-col justify-between ${
                    isHigh
                      ? "border-rose-300 ring-2 ring-rose-100"
                      : isMed
                      ? "border-amber-300 ring-1 ring-amber-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">
                        {pred.disease_name}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                          isHigh
                            ? "bg-rose-100 text-rose-800"
                            : isMed
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {pred.risk_level} ({pred.risk_score}%)
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-mono">
                      Pathogen: {pred.pathogen}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isHigh
                            ? "bg-rose-600"
                            : isMed
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${pred.risk_score}%` }}
                      />
                    </div>

                    {/* Why is the risk this score? (Explainable Factor Breakdown) */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                        Why is this risk level predicted?
                      </span>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {pred.explanations?.map((exp: string, eIdx: number) => (
                          <li key={eIdx} className="flex items-start space-x-1.5">
                            <span className="text-teal-600 font-bold">•</span>
                            <span className="text-[11px] leading-snug">{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 bg-slate-50/50 p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Recommended Agronomic Action
                    </span>
                    <ul className="text-xs text-slate-800 space-y-1">
                      {pred.recommendations?.map((rec: string, rIdx: number) => (
                        <li key={rIdx} className="text-[11px] font-medium leading-snug flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Interactive Explainable Model Simulator (Requirement 16) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Interactive Explainable Risk Engine Simulator
            </h2>
            <p className="text-xs text-slate-500">
              Test how water parameters directly impact the additive disease risk score
            </p>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            Additive Explainable Model
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                TARGET PATHOGEN
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["WSSV", "Vibriosis", "EMS_AHPND"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSimDisease(d)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      simDisease === d
                        ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* DO Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Dissolved Oxygen (DO):</span>
                <span className="text-teal-700">{simDO} mg/L</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="8.0"
                step="0.1"
                value={simDO}
                onChange={(e) => setSimDO(parseFloat(e.target.value))}
                className="w-full accent-teal-600"
              />
              <span className="text-[10px] text-slate-400">Critical below 3.5 mg/L (+25 risk points)</span>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Water Temperature:</span>
                <span className="text-blue-700">{simTemp} °C</span>
              </div>
              <input
                type="range"
                min="23.0"
                max="35.0"
                step="0.5"
                value={simTemp}
                onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <span className="text-[10px] text-slate-400">Cold shock &lt; 26°C triggers WSSV; &gt; 31.5°C triggers Vibrio</span>
            </div>

            {/* Ammonia Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Unionized Ammonia (TAN):</span>
                <span className="text-rose-700">{simAmmonia} mg/L</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.25"
                step="0.01"
                value={simAmmonia}
                onChange={(e) => setSimAmmonia(parseFloat(e.target.value))}
                className="w-full accent-rose-600"
              />
              <span className="text-[10px] text-slate-400">Toxic &gt; 0.10 mg/L (+20 to +30 risk points)</span>
            </div>

            {/* Feed Drop Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Observed Appetite Drop:</span>
                <span className="text-amber-700">{simFeedDrop}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={simFeedDrop}
                onChange={(e) => setSimFeedDrop(parseInt(e.target.value))}
                className="w-full accent-amber-600"
              />
              <span className="text-[10px] text-slate-400">Lethargy &gt; 40% appetite cessation (+15 risk points)</span>
            </div>
          </div>

          {/* Live Calculated Output */}
          {simResult && (
            <div className="bg-slate-50/70 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Computed Risk Score
                    </span>
                    <h3 className="text-xl font-black text-slate-900">
                      {simResult.disease_name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-900">
                      {simResult.risk_score}
                    </span>
                    <span className="text-xs text-slate-500 block">/ 100</span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border text-center font-black text-sm uppercase tracking-wider ${
                    simResult.risk_level === "HIGH" || simResult.risk_level === "CRITICAL"
                      ? "bg-rose-100 text-rose-800 border-rose-300"
                      : simResult.risk_level === "MEDIUM"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                  }`}
                >
                  CLASSIFICATION: {simResult.risk_level} RISK
                </div>

                {/* Contributor Point Breakdown (Requirement 16) */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Mathematical Points Breakdown:
                  </span>
                  <div className="space-y-1 text-xs">
                    {Object.entries(simResult.contributors || {}).map(([key, val]: any) => (
                      <div key={key} className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600 capitalize">{key.replace(/_/g, " ")}:</span>
                        <span className="font-bold text-slate-900">+{val} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                Formula: &Sigma; Weighted Environmental Stressors + Behavioral Appetite cessation.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
