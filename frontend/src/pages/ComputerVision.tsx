import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Camera,
  Upload,
  Info,
  CheckCircle,
  AlertTriangle,
  Play,
  Eye,
  Crosshair,
  Sparkles,
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
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Computer Vision Visual Inspection
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Automated Check-Tray Pellets & Benthic Swimming Activity Detection
          </p>
        </div>

        <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 cursor-pointer shadow-sm transition-colors">
          <Upload className="h-4 w-4" />
          <span>Upload Pond Photo / Video</span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Mandatory Disclaimer (Requirement 17) */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3 shadow-subtle">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">
            COMPUTER VISION VALIDATION DISCLAIMER:
          </p>
          <p className="text-amber-800 mt-0.5">
            Computer vision provides <strong>preliminary observation only</strong>. Laboratory confirmation is required for disease diagnosis. Optical models evaluate tray clearing rates, pellet counts, and macro activity indicators.
          </p>
        </div>
      </div>

      {/* Sample Cases for 1-Click Evaluation */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Select Check-Tray Sample Case to Test:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {samples.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectSample(s)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeSample?.id === s.id && !uploadedFile
                  ? "bg-teal-50/70 border-teal-500 ring-2 ring-teal-200 shadow-sm"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-900">{s.title}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    s.metrics.activity === "LETHARGIC"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {s.metrics.activity}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2">
                {s.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Analysis Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Simulated Inspection Frame */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-teal-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Visual Inspection Viewport (Simulated Optical Feed)
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Resolution: 640 x 480 px
            </span>
          </div>

          {/* Visual Canvas Representation */}
          <div className="relative aspect-[4/3] bg-gradient-to-b from-teal-950 via-slate-900 to-teal-950 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center p-4 shadow-inner">
            {/* Water Ripple & Check Tray Visual */}
            <div className="absolute inset-4 rounded-full border-2 border-emerald-400/20 bg-teal-900/30 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border border-dashed border-teal-300/30" />
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
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Detected Vision Categories
            </h3>

            {analyzing ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Running computer vision contour detection & inference...
              </div>
            ) : analysisResult ? (
              <div className="space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block font-semibold">Active Shrimp Count</span>
                    <span className="text-xl font-black text-slate-900">
                      {analysisResult.shrimp_count}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block font-semibold">Activity Vigor</span>
                    <span
                      className={`text-xl font-black ${
                        analysisResult.activity_level === "LETHARGIC"
                          ? "text-rose-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {analysisResult.activity_level}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block font-semibold">Residual Feed Pellets</span>
                    <span
                      className={`text-xl font-black ${
                        analysisResult.uneaten_feed_pellets > 15
                          ? "text-rose-600"
                          : "text-slate-900"
                      }`}
                    >
                      {analysisResult.uneaten_feed_pellets} <span className="text-xs font-normal text-slate-500">pellets</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block font-semibold">Tray Clearing %</span>
                    <span className="text-xl font-black text-teal-700">
                      {analysisResult.tray_consumption_pct}%
                    </span>
                  </div>
                </div>

                {/* Dead Shrimp Count */}
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Dead / Moribund Shrimp Identified:</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded ${
                      analysisResult.dead_shrimp_count > 0
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {analysisResult.dead_shrimp_count} Detected
                  </span>
                </div>

                {/* Summary Notes */}
                <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 text-xs text-teal-900 space-y-1">
                  <span className="font-bold block">Observation Summary:</span>
                  <p className="text-[11px] text-teal-800 leading-relaxed">
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
