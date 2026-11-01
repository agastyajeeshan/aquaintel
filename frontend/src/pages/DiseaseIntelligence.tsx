import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  Microscope,
  Info,
  CheckCircle,
  Database,
  RefreshCw,
  SlidersHorizontal,
  FlaskConical,
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3F3E9] text-[#247653]">
              <Microscope className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#172820] tracking-tight">
              Disease Risk Intelligence & Biosecurity
            </h1>
          </div>
          <p className="text-sm text-[#68776F] mt-1">
            Multi-Pathogen Predictive Risk Estimation & Environmental Vulnerability Assessment
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-soft-warning">
            ⚠️ EXPERIMENTAL MODEL (SYNTHETIC)
          </span>
          <span className="badge-soft-info">
            WSSV • Vibriosis • EMS/AHPND • Black Gill
          </span>
        </div>
      </div>

      {/* Mandatory Scientific & Veterinary Notice */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs flex items-start space-x-3 shadow-soft">
        <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold tracking-wide">
            VETERINARY GOVERNANCE & SCIENTIFIC SAFETY DISCLAIMER:
          </p>
          <p className="text-amber-900 leading-relaxed">
            AquaIntel provides mathematical disease <strong>vulnerability risk scoring</strong> based on ambient water-quality stressors (hypoxia, thermal shock, toxic ammonia) and behavioral feed response. Water parameters and computer vision alone <strong>cannot confirm pathogen infection</strong>. Models trained on synthetic baseline datasets are experimental and must not be used for chemical medication or culling decisions. Laboratory RT-qPCR assays and physical inspection by certified aquatic animal health professionals remain mandatory.
          </p>
        </div>
      </div>

      {/* Dataset & Model Provenance Registry */}
      <div className="soft-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E3EAE5]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#E3F3E9] text-[#247653]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172820]">
                Dataset & ML Pipeline Provenance Registry
              </h2>
              <p className="text-xs text-[#68776F]">
                Offline ZIP archive ingestion, schema validation audit, and training provenance
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunValidation}
              disabled={validatingDataset}
              className="btn-primary text-xs flex items-center space-x-1.5 py-1.5 px-3"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${validatingDataset ? "animate-spin" : ""}`} />
              <span>{validatingDataset ? "Auditing Pipeline..." : "Run Validation Audit"}</span>
            </button>
            <button
              onClick={() => setShowDataDetails(!showDataDetails)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              {showDataDetails ? "Hide Class Matrix" : "View Class Matrix"}
            </button>
          </div>
        </div>

        {/* Provenance KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-[#F6F8F6] rounded-xl border border-[#E3EAE5]">
            <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
              Discovered Archive
            </span>
            <span
              className="text-xs font-mono font-semibold text-[#172820] truncate block mt-0.5"
              title={datasetReport?.zip_archive_path || "AquaIntel_Prawn_Disease_Dataset_Starter_Pack.zip"}
            >
              {datasetReport?.zip_archive_path ? datasetReport.zip_archive_path.split("/").pop() : "Starter Pack ZIP"}
            </span>
            <span className="text-[10px] text-[#247653] font-semibold block mt-1">
              Extracted: ai/data/disease/raw
            </span>
          </div>

          <div className="p-3 bg-[#F6F8F6] rounded-xl border border-[#E3EAE5]">
            <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
              Dataset Records
            </span>
            <span className="text-lg font-bold text-[#172820] tabular-nums block mt-0.5">
              {datasetReport?.total_rows_loaded || 1200} Rows
            </span>
            <span className="badge-soft-warning text-[10px] py-0.5 mt-0.5 inline-block">
              {datasetReport?.provenance?.synthetic_rows || 1200} Synthetic Demo / 0 Real
            </span>
          </div>

          <div className="p-3 bg-[#F6F8F6] rounded-xl border border-[#E3EAE5]">
            <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
              Active Pipeline Model
            </span>
            <span className="text-xs font-bold text-[#172820] block mt-0.5 truncate">
              {modelStatus?.model_name || "Balanced Random Forest"}
            </span>
            <span className="badge-soft-info text-[10px] py-0.5 mt-0.5 inline-block font-mono">
              v{modelStatus?.version || "1.0.0-synthetic"}
            </span>
          </div>

          <div className="p-3 bg-[#F6F8F6] rounded-xl border border-[#E3EAE5]">
            <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
              Clinical Status
            </span>
            <span className="text-xs font-bold text-[#C84040] block mt-0.5 truncate">
              NOT VALIDATED
            </span>
            <span className="text-[10px] text-[#68776F] block mt-1">
              Requires certified field PCR tags
            </span>
          </div>
        </div>

        {/* Expandable Class Distribution & Missing Data Table */}
        {showDataDetails && datasetReport && (
          <div className="pt-3 border-t border-[#E3EAE5] space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-[#172820] block mb-2">
                  Dataset Class Distribution (Target Labels)
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(datasetReport.class_distribution || {}).map(([cls, count]: any) => (
                    <div
                      key={cls}
                      className="flex justify-between items-center py-1 px-2.5 rounded-lg bg-[#F6F8F6] border border-[#E3EAE5]"
                    >
                      <span className="font-mono font-semibold text-[#172820]">{cls}</span>
                      <span className="text-[#68776F] tabular-nums">
                        {count} rows ({((count / datasetReport.total_rows_loaded) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-[#172820] block mb-2">
                  Data Quality & Imputation Audit
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(datasetReport.missing_values_by_column || {}).map(([col, stats]: any) => (
                    <div
                      key={col}
                      className="flex justify-between items-center py-1 px-2.5 rounded-lg bg-[#F6F8F6] border border-[#E3EAE5]"
                    >
                      <span className="font-mono text-[#172820]">{col}</span>
                      <span className="text-amber-800 font-semibold tabular-nums">
                        {stats.missing_count} nulls ({stats.missing_pct}%) • Median Imputed
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
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-[#68776F] uppercase tracking-wider shrink-0 mr-1">
          Select Pond:
        </span>
        {ponds.map((p) => {
          const isSelected = selectedPondId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPondId(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                isSelected
                  ? "bg-[#247653] text-white shadow-soft"
                  : "bg-white text-[#172820] border border-[#E3EAE5] hover:bg-[#EFF4F0]"
              }`}
            >
              {p.name} {p.status === "RED" && "⚠️"}
            </button>
          );
        })}
      </div>

      {/* Selected Pond Detailed Pathogen Breakdown */}
      {selectedPondRisk && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <h2 className="text-base font-bold text-[#172820]">
              Pathogen Risk Breakdown for {selectedPondRisk.pond_name} (DOC {selectedPondRisk.doc})
            </h2>
            <span className="text-xs text-[#68776F] tabular-nums">
              Telemetry Context: DO {selectedPondRisk.live_metrics.do} mg/L • Temp {selectedPondRisk.live_metrics.temperature}°C • Ammonia {selectedPondRisk.live_metrics.ammonia} mg/L
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {selectedPondRisk.predictions.map((pred: any, idx: number) => {
              const isHigh = pred.risk_level === "HIGH" || pred.risk_level === "CRITICAL";
              const isMed = pred.risk_level === "MEDIUM";

              return (
                <div
                  key={idx}
                  className={`soft-card p-5 flex flex-col justify-between transition-all ${
                    isHigh
                      ? "border-[#C84040]/40 ring-2 ring-red-100"
                      : isMed
                      ? "border-amber-300 ring-1 ring-amber-100"
                      : "border-[#E3EAE5]"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#172820]">
                        {pred.disease_name}
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          isHigh
                            ? "badge-soft-danger"
                            : isMed
                            ? "badge-soft-warning"
                            : "badge-soft-success"
                        }`}
                      >
                        {pred.risk_level} ({pred.risk_score}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#68776F]">
                      <span className="font-mono">Pathogen: {pred.pathogen}</span>
                      <span className="badge-soft-warning text-[10px] py-0.5">
                        SIMULATED RISK
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#EFF4F0] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isHigh
                            ? "bg-[#C84040]"
                            : isMed
                            ? "bg-amber-500"
                            : "bg-[#21845A]"
                        }`}
                        style={{ width: `${pred.risk_score}%` }}
                      />
                    </div>

                    {/* Contributing Environmental Stressors */}
                    <div className="space-y-1.5 pt-2 border-t border-[#E3EAE5]">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#68776F] block">
                        Contributing Stress Factors
                      </span>
                      <ul className="space-y-1 text-xs text-[#172820]">
                        {pred.explanations?.map((exp: string, eIdx: number) => (
                          <li key={eIdx} className="flex items-start space-x-1.5">
                            <span className="text-[#247653] font-bold">•</span>
                            <span className="text-[11px] leading-snug">{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="mt-4 pt-3 border-t border-[#E3EAE5] space-y-1 bg-[#F6F8F6] p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
                      Recommended Preventive Protocol
                    </span>
                    <ul className="text-xs text-[#172820] space-y-1">
                      {pred.recommendations?.map((rec: string, rIdx: number) => (
                        <li key={rIdx} className="text-[11px] leading-snug flex items-center space-x-1.5">
                          <CheckCircle className="h-3 w-3 text-[#21845A] shrink-0" />
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
      <div className="soft-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#E3EAE5] gap-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#E3F3E9] text-[#247653]">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172820]">
                Interactive ML Pipeline & Stressor Simulation
              </h2>
              <p className="text-xs text-[#68776F]">
                Simulate how real-time water quality stress parameters trigger the multi-pathogen ML pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="badge-soft-info text-xs font-mono font-semibold">
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
                <span className="text-[#172820]">Dissolved Oxygen (DO):</span>
                <span className="text-[#247653] font-mono tabular-nums">{simDO.toFixed(1)} mg/L</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.1"
                value={simDO}
                onChange={(e) => setSimDO(parseFloat(e.target.value))}
                className="w-full accent-[#247653]"
              />
              <span className="text-[10px] text-[#68776F]">Hypoxic stress triggered below 3.5 mg/L</span>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#172820]">Water Temperature:</span>
                <span className="text-[#168B91] font-mono tabular-nums">{simTemp.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min="22.0"
                max="36.0"
                step="0.5"
                value={simTemp}
                onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                className="w-full accent-[#168B91]"
              />
              <span className="text-[10px] text-[#68776F]">&lt; 26.5°C triggers WSSV; &gt; 31.5°C accelerates Vibrio</span>
            </div>

            {/* Ammonia Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#172820]">Total Ammonia Nitrogen (TAN):</span>
                <span className="text-[#C84040] font-mono tabular-nums">{simAmmonia.toFixed(2)} mg/L</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.40"
                step="0.01"
                value={simAmmonia}
                onChange={(e) => setSimAmmonia(parseFloat(e.target.value))}
                className="w-full accent-[#C84040]"
              />
              <span className="text-[10px] text-[#68776F]">Sub-lethal toxicity threshold &gt; 0.10 mg/L</span>
            </div>

            {/* Mortality Count Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#172820]">24h Observed Mortality Count:</span>
                <span className="text-[#C84040] font-mono tabular-nums">{simMortality} dead shrimp</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="1"
                value={simMortality}
                onChange={(e) => setSimMortality(parseInt(e.target.value))}
                className="w-full accent-[#C84040]"
              />
            </div>

            {/* Feeding Response Selector */}
            <div>
              <label className="block text-xs font-bold text-[#172820] mb-1.5 uppercase tracking-wide">
                Observed Feeding Response
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["NORMAL", "REDUCED", "ABNORMAL"].map((resp) => (
                  <button
                    key={resp}
                    onClick={() => setSimFeedResp(resp)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      simFeedResp === resp
                        ? "bg-[#247653] text-white border-[#247653] shadow-soft"
                        : "bg-[#F6F8F6] text-[#172820] border-[#E3EAE5] hover:bg-[#EFF4F0]"
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
            <div className="bg-[#F6F8F6] rounded-xl p-5 border border-[#E3EAE5] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#68776F] uppercase tracking-wider block">
                      ML Predicted Condition
                    </span>
                    <h3 className="text-xl font-bold text-[#172820]">
                      {simResult.top_predicted_condition}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-[#172820] tabular-nums">
                      {simResult.confidence_score}%
                    </span>
                    <span className="text-xs text-[#68776F] block">Confidence Score</span>
                  </div>
                </div>

                <div
                  className={`p-2 rounded-xl border text-center font-bold text-xs uppercase tracking-wider ${
                    simResult.risk_category === "HIGH" || simResult.risk_category === "CRITICAL"
                      ? "badge-soft-danger block"
                      : simResult.risk_category === "MEDIUM"
                      ? "badge-soft-warning block"
                      : "badge-soft-success block"
                  }`}
                >
                  CLASSIFICATION: {simResult.risk_category} RISK LEVEL
                </div>

                {/* Pathogen Probability Distribution */}
                {simResult.pathogen_probability_distribution && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-[#172820] block">
                      Multi-Class Probability Distribution:
                    </span>
                    <div className="space-y-1">
                      {Object.entries(simResult.pathogen_probability_distribution).map(([pat, prob]: any) => (
                        <div key={pat} className="flex items-center text-xs">
                          <span className="w-28 text-[#68776F] font-mono text-[11px] truncate">{pat}:</span>
                          <div className="flex-1 bg-[#EFF4F0] rounded-full h-1.5 overflow-hidden mx-2">
                            <div
                              className="bg-[#247653] h-1.5 rounded-full"
                              style={{ width: `${prob * 100}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-[#172820] w-12 text-right tabular-nums">
                            {(prob * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contributing Stressors */}
                <div className="space-y-1 pt-2 border-t border-[#E3EAE5]">
                  <span className="text-[11px] font-bold text-[#172820] block">
                    Contributing Factors:
                  </span>
                  <ul className="space-y-1 text-xs text-[#68776F]">
                    {simResult.contributing_stressors?.map((st: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-1.5 text-[11px]">
                        <span className="text-[#247653] font-bold">•</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E3EAE5] text-[10px] text-[#68776F] flex items-center justify-between">
                <span>Model: {simResult.model_id}</span>
                <span className="font-mono text-amber-700 font-semibold">{simResult.validation_status}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Footer loading indicator */}
      {loading && (
        <div className="text-center py-2 text-xs text-[#68776F] flex items-center justify-center space-x-1">
          <FlaskConical className="h-3.5 w-3.5 animate-pulse text-[#247653]" />
          <span>Synchronizing pathogen registry...</span>
        </div>
      )}
    </div>
  );
};
