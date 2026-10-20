import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  X,
  AlertOctagon,
  Flame,
  Droplets,
  RadioTower,
  RefreshCw,
  CheckCircle,
} from "lucide-react";

export const SimulateEventModal: React.FC = () => {
  const { isSimulateModalOpen, setIsSimulateModalOpen, refreshData } = useApp();
  const [selectedPond, setSelectedPond] = useState<number>(4);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  if (!isSimulateModalOpen) return null;

  const handleInject = async (eventType: string) => {
    setLoading(true);
    setStatusMsg("");
    try {
      if (eventType === "CLEAR") {
        await api.resetSimulatorEvents();
        setStatusMsg("All ponds restored to natural diurnal cycle.");
      } else {
        const res = await api.injectEvent(selectedPond, eventType);
        setStatusMsg(res.message || `Injected ${eventType} into Pond ${selectedPond}`);
      }
      await refreshData();
    } catch (e: any) {
      setStatusMsg("Error injecting simulation event: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              IoT Sensor Simulator & Event Injection
            </h3>
            <p className="text-xs text-slate-500">
              Demonstrate automated failover, safety feeding cutoffs & aeration
            </p>
          </div>
          <button
            onClick={() => setIsSimulateModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Pond Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              TARGET POND FOR TEST
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPond(p)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    selectedPond === p
                      ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Pond {p < 10 ? `0${p}` : p}
                </button>
              ))}
            </div>
          </div>

          {/* Event Triggers */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700">
              SIMULATE ABNORMAL EVENT
            </label>

            {/* Low DO Event */}
            <button
              disabled={loading}
              onClick={() => handleInject("LOW_DO")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                  <Droplets className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-900">
                    Low DO Event (&lt; 3.0 mg/L)
                  </p>
                  <p className="text-xs text-rose-700">
                    Triggers emergency full aeration & cuts off feeding immediately
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-700 underline">Inject</span>
            </button>

            {/* High Ammonia Event */}
            <button
              disabled={loading}
              onClick={() => handleInject("HIGH_AMMONIA")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <AlertOctagon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    High Ammonia Spike (&gt; 0.18 mg/L)
                  </p>
                  <p className="text-xs text-amber-700">
                    Simulates organic sludge shock; reduces feed 50% & alerts farm team
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-700 underline">Inject</span>
            </button>

            {/* Temperature Spike */}
            <button
              disabled={loading}
              onClick={() => handleInject("TEMP_SPIKE")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-100/70 text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-900">
                    Temperature Spike (34.8°C)
                  </p>
                  <p className="text-xs text-orange-700">
                    Afternoon thermal stress; triggers bottom circulation aerators
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-orange-700 underline">Inject</span>
            </button>

            {/* Sensor Failure */}
            <button
              disabled={loading}
              onClick={() => handleInject("SENSOR_FAILURE")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <RadioTower className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-purple-900">
                    Sensor Failure / Node Offline
                  </p>
                  <p className="text-xs text-purple-700">
                    Telemetry timeout warning; engages conservative safety failsafe
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-700 underline">Inject</span>
            </button>
          </div>

          {statusMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => handleInject("CLEAR")}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset All Ponds to Normal</span>
          </button>
          <button
            onClick={() => setIsSimulateModalOpen(false)}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 shadow-sm"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
