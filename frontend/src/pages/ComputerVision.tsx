import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Camera,
  Upload,
  Info,
  Crosshair,
  Loader2,
} from "lucide-react";

export const ComputerVision: React.FC = () => {
  const [samples, setSamples] = useState<any[]>([]);
  const [activeSample, setActiveSample] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    const loadSamples = async () => {
      try {
        const res = await api.getCVSamples();
        setSamples(res);
        if (res && res.length > 0) {
          handleSelectSample(res[0]);
        }
      } catch (e) {
        console.warn("Failed to load CV samples", e);
      }
    };
    loadSamples();
  }, []);

  const handleSelectSample = async (s: any) => {
    setActiveSample(s);
    setUploadedFile(null);
    setAnalyzing(true);
    try {
      const res = await api.analyzeCV();
      setAnalysisResult({
        ...res,
        shrimp_count: s.metrics.shrimp_count,
        uneaten_feed_pellets: s.metrics.uneaten_pellets,
        activity_level: s.metrics.activity,
        dead_shrimp_count: s.metrics.dead_count,
        tray_consumption_pct: parseInt(s.metrics.tray_consumption),
        observation_summary: s.description,
      });
    } catch (e) {
      console.warn("Analysis failed", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setAnalyzing(true);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await api.analyzeCV(formData);
        setAnalysisResult(res);
      } catch (err) {
        console.warn("Upload analysis error", err);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3F3E9] text-[#247653]">
              <Camera className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#172820] tracking-tight">
              Computer Vision Visual Inspection
            </h1>
          </div>
          <p className="text-sm text-[#68776F] mt-1">
            Automated Check-Tray Pellets & Benthic Swimming Activity Detection
          </p>
        </div>

        <label className="btn-primary text-xs flex items-center space-x-2 py-2 px-3.5 cursor-pointer">
          <Upload className="h-4 w-4" />
          <span>Upload Pond Imagery / Video</span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs flex items-start space-x-3 shadow-soft">
        <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold tracking-wide">
            COMPUTER VISION VALIDATION DISCLAIMER:
          </p>
          <p className="text-amber-900 leading-relaxed">
            Computer vision provides <strong>preliminary behavioral and physical observation only</strong>. Laboratory diagnostic assays are mandatory for pathogen identification. Optical models evaluate tray clearing rates, unconsumed pellet counts, and swimming vigor.
          </p>
        </div>
      </div>

      {/* Sample Cases for 1-Click Evaluation */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-[#68776F] uppercase tracking-wider block">
          Select Check-Tray Sample Case:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {samples.map((s) => {
            const isSelected = activeSample?.id === s.id && !uploadedFile;
            return (
              <button
                key={s.id}
                onClick={() => handleSelectSample(s)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-[#E3F3E9]/50 border-[#247653] ring-1 ring-[#247653] shadow-soft"
                    : "bg-white border-[#E3EAE5] hover:bg-[#F6F8F6]"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-[#172820]">{s.title}</span>
                  <span
                    className={`text-[10px] ${
                      s.metrics.activity === "LETHARGIC"
                        ? "badge-soft-danger"
                        : "badge-soft-success"
                    }`}
                  >
                    {s.metrics.activity}
                  </span>
                </div>
                <p className="text-[11px] text-[#68776F] line-clamp-2">
                  {s.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Analysis Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Simulated Inspection Frame */}
        <div className="lg:col-span-7 soft-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
            <div className="flex items-center space-x-2">
              <Camera className="h-4 w-4 text-[#247653]" />
              <h2 className="text-sm font-bold text-[#172820]">
                Visual Inspection Viewport (Simulated Optical Feed)
              </h2>
            </div>
            <span className="text-xs font-mono text-[#68776F] tabular-nums">
              Resolution: 640 × 480 px
            </span>
          </div>

          {/* Visual Canvas Representation */}
          <div className="relative aspect-[4/3] bg-gradient-to-b from-[#11241C] via-[#172820] to-[#0E1E17] rounded-xl overflow-hidden border border-[#247653]/30 flex items-center justify-center p-4 shadow-inner">
            {/* Water Ripple & Check Tray Visual */}
            <div className="absolute inset-4 rounded-full border-2 border-emerald-400/20 bg-[#168B91]/10 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border border-dashed border-emerald-300/30" />
            </div>

            {/* Bounding Boxes Rendering */}
            {analysisResult?.bounding_boxes?.slice(0, 20).map((b: any, bIdx: number) => {
              const isPellet = b.status === "uneaten_feed";
              return (
                <div
                  key={bIdx}
                  className={`absolute border rounded flex items-start p-0.5 text-[8px] font-mono pointer-events-none transition-all ${
                    isPellet
                      ? "border-amber-400 bg-amber-400/10 text-amber-200"
                      : "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                  }`}
                  style={{
                    left: `${(b.x / 640) * 85 + 5}%`,
                    top: `${(b.y / 480) * 75 + 10}%`,
                    width: `${b.width * 0.9}px`,
                    height: `${b.height * 0.9}px`,
                  }}
                >
                  <span className="bg-black/60 px-0.5 rounded scale-75 origin-top-left">
                    {isPellet ? "Feed" : "Shrimp"} {Math.round(b.confidence * 100)}%
                  </span>
                </div>
              );
            })}

            {/* Scanning HUD Overlay */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-emerald-400 px-2.5 py-1 rounded text-[10px] font-mono flex items-center space-x-1.5 border border-emerald-500/30">
              <Crosshair className="h-3 w-3 animate-spin" />
              <span>OPENCV EDGE TRACKER: ACTIVE</span>
            </div>

            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-slate-300 px-2.5 py-1 rounded text-[10px] font-mono border border-slate-600">
              <span>Tray Depth: 1.2m • Secchi: 34cm</span>
            </div>
          </div>
        </div>

        {/* Right: Detected Categories & Metrics */}
        <div className="lg:col-span-5 space-y-4">
          <div className="soft-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#172820] pb-2 border-b border-[#E3EAE5]">
              Detected Optical Metrics
            </h3>

            {analyzing ? (
              <div className="p-8 text-center text-xs text-[#68776F] flex flex-col items-center justify-center space-y-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#247653]" />
                <span>Running computer vision contour detection & inference...</span>
              </div>
            ) : analysisResult ? (
              <div className="space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
                    <span className="text-[#68776F] block font-semibold">Active Shrimp Count</span>
                    <span className="text-xl font-bold text-[#172820] tabular-nums">
                      {analysisResult.shrimp_count}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
                    <span className="text-[#68776F] block font-semibold">Activity Vigor</span>
                    <span
                      className={`text-xl font-bold ${
                        analysisResult.activity_level === "LETHARGIC"
                          ? "text-[#C84040]"
                          : "text-[#21845A]"
                      }`}
                    >
                      {analysisResult.activity_level}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
                    <span className="text-[#68776F] block font-semibold">Residual Feed Pellets</span>
                    <span
                      className={`text-xl font-bold tabular-nums ${
                        analysisResult.uneaten_feed_pellets > 15
                          ? "text-[#C84040]"
                          : "text-[#172820]"
                      }`}
                    >
                      {analysisResult.uneaten_feed_pellets} <span className="text-xs font-normal text-[#68776F]">pellets</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
                    <span className="text-[#68776F] block font-semibold">Tray Clearance Rate</span>
                    <span className="text-xl font-bold text-[#247653] tabular-nums">
                      {analysisResult.tray_consumption_pct}%
                    </span>
                  </div>
                </div>

                {/* Dead Shrimp Count */}
                <div className="p-3 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] flex justify-between items-center text-xs">
                  <span className="font-bold text-[#172820]">Moribund / Dead Shrimp Identified:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-xs tabular-nums ${
                      analysisResult.dead_shrimp_count > 0
                        ? "badge-soft-danger"
                        : "badge-soft-success"
                    }`}
                  >
                    {analysisResult.dead_shrimp_count} Detected
                  </span>
                </div>

                {/* Summary Notes */}
                <div className="p-3.5 rounded-xl border border-[#E3EAE5] bg-[#EFF4F0] text-xs text-[#172820] space-y-1">
                  <span className="font-bold block text-[#247653]">Observation Summary:</span>
                  <p className="text-[11px] text-[#68776F] leading-relaxed">
                    {analysisResult.observation_summary}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
