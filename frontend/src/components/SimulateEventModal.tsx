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
  AlertTriangle,
  ZapOff,
  Clock,
  Activity,
  ShieldAlert,
  ArrowDownRight
} from "lucide-react";

export const SimulateEventModal: React.FC = () => {
  const { isSimulateModalOpen, setIsSimulateModalOpen, refreshData } = useApp();
  const [selectedPond, setSelectedPond] = useState<number>(4);
  const [activeCategory, setActiveCategory] = useState<"water" | "faults" | "disease">("water");
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  if (!isSimulateModalOpen) return null;

  const handleInject = async (eventType: string) => {
    setLoading(true);
    setStatusMsg("");
    try {
      if (eventType === "CLEAR") {
        await api.resetSimulatorEvents();
        setStatusMsg("All 10 ponds restored to natural diurnal balance.");
      } else {
        const res = await api.injectEvent(selectedPond, eventType);
        setStatusMsg(res.message || `Injected scenario '${eventType}' into Pond ${selectedPond}`);
      }
      await refreshData();
    } catch (e: any) {
      setStatusMsg("Simulation execution error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-slate-900">
                IoT Sensor Simulator & Event Injection
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                SYNTHETIC ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Validate automated failover, aeration hysteresis, feeding cutoffs, and edge logic
            </p>
          </div>
          <button
            onClick={() => setIsSimulateModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Pond Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              TARGET POND FOR SCENARIO
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

          {/* Category Tabs */}
          <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
            <button
              onClick={() => setActiveCategory("water")}
              className={`pb-2 border-b-2 transition-colors ${
                activeCategory === "water"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Water Quality Stressors
            </button>
            <button
              onClick={() => setActiveCategory("faults")}
              className={`pb-2 border-b-2 transition-colors ${
                activeCategory === "faults"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Equipment & Network Faults
            </button>
            <button
              onClick={() => setActiveCategory("disease")}
              className={`pb-2 border-b-2 transition-colors ${
                activeCategory === "disease"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Disease & Recovery
            </button>
          </div>

          {/* Scenario Buttons */}
          <div className="space-y-2">
            {activeCategory === "water" && (
              <>
                <button
                  disabled={loading}
                  onClick={() => handleInject("CRITICAL_LOW_DO")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                      <Droplets className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rose-900">1. Critical Low DO (&lt; 3.0 mg/L)</p>
                      <p className="text-xs text-rose-700">Emergency aeration full boost; automated feeding strictly halted</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-700 underline">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("GRADUAL_FALLING_DO")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">2. Gradually Falling DO (3.9 mg/L)</p>
                      <p className="text-xs text-amber-700">Early morning oxygen depletion; engages supplementary paddlewheel</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-700 underline">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("RISING_AMMONIA")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      <AlertOctagon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">3. Rising Ammonia (&gt; 0.18 mg/L)</p>
                      <p className="text-xs text-amber-700">Simulates benthic organic accumulation; cuts feed ration by 50%</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-700 underline">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("HIGH_TEMPERATURE")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                      <Flame className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-orange-900">4. High Temperature (34.8°C)</p>
                      <p className="text-xs text-orange-700">Afternoon solar peak; activates deep-water jet circulation</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-orange-700 underline">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("ABNORMAL_PH")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-purple-900">5. Abnormal pH Spike (8.9 pH)</p>
                      <p className="text-xs text-purple-700">Algal bloom photosynthesis excursion; raises alkalinity warning</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-700 underline">Inject</span>
                </button>
              </>
            )}

            {activeCategory === "faults" && (
              <>
                <button
                  disabled={loading}
                  onClick={() => handleInject("SENSOR_DISCONNECTION")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <RadioTower className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-purple-900">6. Sensor Disconnection / Node Offline</p>
                      <p className="text-xs text-purple-700">Optical sensor failure; holds conservative fail-safe aeration</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-700 underline">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("STALE_READINGS")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-slate-200 text-slate-700">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">7. Stale Telemetry Readings</p>
                      <p className="text-xs text-slate-500">Freezes values for 45 minutes; flags staleness in UI</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 underline">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("AERATOR_FAILURE")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                      <ZapOff className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rose-900">8. Aerator Motor Overload Trip</p>
                      <p className="text-xs text-rose-700">Contactor fault; triggers redundant secondary aerator automatically</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-700 underline">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("FEEDER_FAILURE")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">9. Feeder Dispenser Jam</p>
                      <p className="text-xs text-amber-700">Auger blockage detected; flags feeder maintenance ticket</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-700 underline">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("ABNORMAL_FEEDING_RESPONSE")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-indigo-900">10. Abnormal Check-Tray Intake (&lt; 30%)</p>
                      <p className="text-xs text-indigo-700">Excess uneaten pellets; flags potential gut syndrome / molting</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 underline">Inject</span>
                </button>
              </>
            )}

            {activeCategory === "disease" && (
              <>
                <button
                  disabled={loading}
                  onClick={() => handleInject("ELEVATED_DISEASE_RISK")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-rose-200 text-rose-800">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rose-900">11. Multi-Stressor Disease Vulnerability</p>
                      <p className="text-xs text-rose-700">DO dip + Temp spike + Ammonia surge; elevates WSSV/Vibrio risk score</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-800 underline">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("RECOVERY")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">12. Post-Intervention Recovery</p>
                      <p className="text-xs text-emerald-700">Simulates restorative water exchange and aerator re-oxygenation</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 underline">Inject</span>
                </button>
              </>
            )}
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
            <span>Restore Natural Diurnal Curves</span>
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
