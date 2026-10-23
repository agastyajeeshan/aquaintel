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
  Database,
  FileCheck,
  RefreshCw,
  Activity,
  FileSpreadsheet,
} from "lucide-react";

export const DiseaseIntelligence: React.FC = () => {
  const { ponds } = useApp();
  const [risksData, setRisksData] = useState<any[]>([]);
  const [selectedPondId, setSelectedPondId] = useState<number>(8); // Pond 8 has elevated risk for demo
  const [loading, setLoading] = useState<boolean>(true);

  // Dataset & Model Provenance State
  const [datasetReport, setDatasetReport] = useState<any>(null);
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [validatingDataset, setValidatingDataset] = useState<boolean>(false);
  const [showDataDetails, setShowDataDetails] = useState<boolean>(false);

  // Interactive Custom Risk Simulator state
  const [simDO, setSimDO] = useState<number>(3.4);
  const [simTemp, setSimTemp] = useState<number>(26.5);
  const [simAmmonia, setSimAmmonia] = useState<number>(0.12);
  const [simMortality, setSimMortality] = useState<number>(18);
  const [simFeedResp, setSimFeedResp] = useState<string>("REDUCED");
  const [simResult, setSimResult] = useState<any>(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [risksRes, reportRes, modelRes] = await Promise.allSettled([
        api.getDiseaseRisks(),
        api.getAIDataQualityReport(),
        api.getAIModelStatus(),
      ]);

      if (risksRes.status === "fulfilled") setRisksData(risksRes.value);
      if (reportRes.status === "fulfilled") setDatasetReport(reportRes.value);
      if (modelRes.status === "fulfilled") setModelStatus(modelRes.value);
    } catch (e) {
      console.warn("Failed to load disease intelligence data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRunValidation = async () => {
    try {
      setValidatingDataset(true);
      const res = await api.validateAIDataset();
      if (res && res.report) {
        setDatasetReport(res.report);
      }
      const mRes = await api.getAIModelStatus();
      setModelStatus(mRes);
    } catch (e) {
      console.error("Validation error:", e);
    } finally {
      setValidatingDataset(false);
    }
  };

  const runCustomEvaluation = async () => {
    try {
      const res = await api.evaluateDiseaseRisk({
        pond_id: selectedPondId,
        temperature_c: simTemp,
        do_mg_l: simDO,
        tan_mg_l: simAmmonia,
        unionized_nh3_mg_l: simAmmonia * 0.1,
        mortality_count_24h: simMortality,
        feeding_response: simFeedResp,
      });
      setSimResult(res);
    } catch (e) {
      console.warn("Failed custom evaluation", e);
    }
  };

  useEffect(() => {
    runCustomEvaluation();
  }, [simDO, simTemp, simAmmonia, simMortality, simFeedResp, selectedPondId]);

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
            Multi-Pathogen Machine Learning & Environmental Vulnerability Decision Support
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            ⚠️ MODEL NOT CLINICALLY VALIDATED
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            WSSV • Vibriosis • EMS/AHPND • Black Gill
          </span>
        </div>
      </div>

      {/* Mandatory Clinical & Scientific Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3 shadow-subtle">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">
            IMPORTANT SCIENTIFIC & VETERINARY GOVERNANCE NOTICE:
          </p>
          <p className="text-amber-800 mt-0.5 leading-relaxed">
            AquaIntel provides mathematical disease <strong>VULNERABILITY RISK ESTIMATION ONLY</strong> based on ambient water-quality stress, diurnal fluctuations, and feeding behavior. Water parameters alone <strong>cannot</strong> diagnose infection. Under Section 5 of the Master Specification, models trained on synthetic demo data are experimental and cannot be used for clinical diagnoses or chemical treatments. Laboratory RT-qPCR assays and pathology inspection by certified aquatic animal health specialists are mandatory.
          </p>
        </div>
      </div>

      {/* Dataset & Model Provenance Registry (Requirement 8) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Integrated Dataset & ML Model Provenance Registry
              </h2>
              <p className="text-xs text-slate-500">
                Source ZIP, raw schema validation audit, and pipeline training status
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunValidation}
              disabled={validatingDataset}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${validatingDataset ? "animate-spin" : ""}`} />
              <span>{validatingDataset ? "Auditing Dataset..." : "Run Validation Audit"}</span>
            </button>
            <button
              onClick={() => setShowDataDetails(!showDataDetails)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            >
              {showDataDetails ? "Hide Schema Breakdown" : "View Class Breakdown"}
            </button>
          </div>
        </div>

        {/* Provenance KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Discovered Archive
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 truncate block mt-0.5" title={datasetReport?.zip_archive_path || "AquaIntel_Prawn_Disease_Dataset_Starter_Pack.zip"}>
              {datasetReport?.zip_archive_path || "Starter Pack ZIP"}
            </span>
            <span className="text-[10px] text-teal-600 font-bold block mt-1">
              Extracted to ai/data/disease/raw
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Dataset Records
            </span>
            <span className="text-lg font-black text-slate-900 block mt-0.5">
              {datasetReport?.total_rows_loaded || 1200} Rows
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
              {datasetReport?.provenance?.synthetic_rows || 1200} Synthetic Demo / 0 Real
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Pipeline Model
            </span>
            <span className="text-xs font-black text-slate-900 block mt-0.5 truncate">
              {modelStatus?.model_name || "Balanced Random Forest"}
            </span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 inline-block mt-0.5">
              {modelStatus?.version || "1.0.0-synthetic"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Validation Status
            </span>
            <span className="text-xs font-black text-rose-700 block mt-0.5 truncate">
              NOT VALIDATED
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              Requires real lab PCR labels
            </span>
          </div>
        </div>

        {/* Expandable Class Distribution & Missing Data Table */}
        {showDataDetails && datasetReport && (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Dataset Class Distribution (Target Labels)
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(datasetReport.class_distribution || {}).map(([cls, count]: any) => (
                    <div key={cls} className="flex justify-between items-center py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-mono font-bold text-slate-800">{cls}</span>
                      <span className="text-slate-600">
                        {count} rows ({((count / datasetReport.total_rows_loaded) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Data Quality & Preprocessing Imputation Audit
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(datasetReport.missing_values_by_column || {}).map(([col, stats]: any) => (
                    <div key={col} className="flex justify-between items-center py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-mono text-slate-800">{col}</span>
                      <span className="text-amber-700 font-bold">
                        {stats.missing_count} missing ({stats.missing_pct}%) - Median Imputed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Pathogen: {pred.pathogen}</span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        SIMULATED RISK
                      </span>
                    </div>

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

                    {/* Why is the risk this score? */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                        Contributing Environmental Stressors
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
                      Recommended Monitoring & Biosecurity
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

      {/* Interactive Trained ML Model & Risk Engine Simulator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Interactive ML Pipeline & Stressor Simulation Engine
            </h2>
            <p className="text-xs text-slate-500">
              Simulates how ambient telemetry directly triggers the multi-pathogen ML pipeline
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              {simResult?.evaluation_type || "MACHINE_LEARNING_PIPELINE"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            {/* DO Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Dissolved Oxygen (DO):</span>
                <span className="text-teal-700 font-mono">{simDO} mg/L</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.1"
                value={simDO}
                onChange={(e) => setSimDO(parseFloat(e.target.value))}
                className="w-full accent-teal-600"
              />
              <span className="text-[10px] text-slate-400">Hypoxic stress below 3.5 mg/L</span>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Water Temperature:</span>
                <span className="text-blue-700 font-mono">{simTemp} °C</span>
              </div>
              <input
                type="range"
                min="22.0"
                max="36.0"
                step="0.5"
                value={simTemp}
                onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <span className="text-[10px] text-slate-400">&lt; 26.5°C triggers WSSV; &gt; 31.5°C accelerates Vibrio</span>
            </div>

            {/* Ammonia Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Total Ammonia Nitrogen (TAN):</span>
                <span className="text-rose-700 font-mono">{simAmmonia} mg/L</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.40"
                step="0.01"
                value={simAmmonia}
                onChange={(e) => setSimAmmonia(parseFloat(e.target.value))}
                className="w-full accent-rose-600"
              />
              <span className="text-[10px] text-slate-400">Toxic &gt; 0.10 mg/L</span>
            </div>

            {/* Mortality Count Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">24h Observed Mortality Count:</span>
                <span className="text-rose-600 font-mono">{simMortality} dead shrimp</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="1"
                value={simMortality}
                onChange={(e) => setSimMortality(parseInt(e.target.value))}
                className="w-full accent-rose-600"
              />
            </div>

            {/* Feeding Response Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                OBSERVED FEEDING RESPONSE
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["NORMAL", "REDUCED", "ABNORMAL"].map((resp) => (
                  <button
                    key={resp}
                    onClick={() => setSimFeedResp(resp)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      simFeedResp === resp
                        ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {resp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Calculated Output */}
          {simResult && (
            <div className="bg-slate-50/70 rounded-xl p-5 border border-slate-200 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Top ML Predicted Condition
                    </span>
                    <h3 className="text-xl font-black text-slate-900">
                      {simResult.top_predicted_condition}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-slate-900">
                      {simResult.confidence_score}%
                    </span>
                    <span className="text-xs text-slate-500 block">Probability Confidence</span>
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-xl border text-center font-black text-xs uppercase tracking-wider ${
                    simResult.risk_category === "HIGH" || simResult.risk_category === "CRITICAL"
                      ? "bg-rose-100 text-rose-800 border-rose-300"
                      : simResult.risk_category === "MEDIUM"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                  }`}
                >
                  CLASSIFICATION: {simResult.risk_category} RISK LEVEL
                </div>

                {/* Pathogen Probability Distribution (7 Classes) */}
                {simResult.pathogen_probability_distribution && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Multi-Class Probability Distribution:
                    </span>
                    <div className="space-y-1">
                      {Object.entries(simResult.pathogen_probability_distribution).map(([pat, prob]: any) => (
                        <div key={pat} className="flex items-center text-xs">
                          <span className="w-28 text-slate-600 font-mono text-[11px] truncate">{pat}:</span>
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden mx-2">
                            <div
                              className="bg-teal-600 h-1.5 rounded-full"
                              style={{ width: `${prob * 100}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-800 w-12 text-right">
                            {(prob * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contributing Stressors */}
                <div className="space-y-1 pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Contributing Factors:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {simResult.contributing_stressors?.map((st: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-1.5 text-[11px]">
                        <span className="text-teal-600 font-bold">•</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                Model: {simResult.model_id} ({simResult.validation_status})
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
