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
  ArrowDownRight,
  Loader2,
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
        setStatusMsg(res.message || `Injected scenario '${eventType}' into Pond 0${selectedPond}`);
      }
      await refreshData();
    } catch (e: any) {
      setStatusMsg("Simulation execution error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="soft-card-elevated max-w-xl w-full border border-[#E3EAE5] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3EAE5] bg-[#F6F8F6]">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-[#172820]">
                IoT Sensor Simulator & Event Injection
              </h3>
              <span className="badge-soft-warning text-[10px] py-0.5">
                SYNTHETIC ENGINE
              </span>
            </div>
            <p className="text-xs text-[#68776F]">
              Validate automated failover, aeration hysteresis, feeding cutoffs, and edge logic
            </p>
          </div>
          <button
            onClick={() => setIsSimulateModalOpen(false)}
            className="p-1.5 rounded-lg text-[#68776F] hover:text-[#172820] hover:bg-[#EFF4F0] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Pond Selector */}
          <div>
            <label className="block text-xs font-bold text-[#172820] mb-2 uppercase tracking-wide">
              Target Pond for Scenario
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => {
                const isSelected = selectedPond === p;
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedPond(p)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      isSelected
                        ? "bg-[#247653] text-white border-[#247653] shadow-soft"
                        : "bg-[#F6F8F6] text-[#172820] border-[#E3EAE5] hover:bg-[#EFF4F0]"
                    }`}
                  >
                    Pond {p < 10 ? `0${p}` : p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex border-b border-[#E3EAE5] space-x-4 text-xs font-semibold">
            <button
              onClick={() => setActiveCategory("water")}
              className={`pb-2 border-b-2 transition-colors ${
                activeCategory === "water"
                  ? "border-[#247653] text-[#247653]"
                  : "border-transparent text-[#68776F] hover:text-[#172820]"
              }`}
            >
              Water Quality Stressors
            </button>
            <button
              onClick={() => setActiveCategory("faults")}
              className={`pb-2 border-b-2 transition-colors ${
                activeCategory === "faults"
                  ? "border-[#247653] text-[#247653]"
                  : "border-transparent text-[#68776F] hover:text-[#172820]"
              }`}
            >
              Equipment & Network Faults
            </button>
            <button
              onClick={() => setActiveCategory("disease")}
              className={`pb-2 border-b-2 transition-colors ${
                activeCategory === "disease"
                  ? "border-[#247653] text-[#247653]"
                  : "border-transparent text-[#68776F] hover:text-[#172820]"
              }`}
            >
              Disease & Recovery
            </button>
          </div>

          {/* Scenario Buttons */}
          <div className="space-y-2.5">
            {activeCategory === "water" && (
              <>
                <button
                  disabled={loading}
                  onClick={() => handleInject("CRITICAL_LOW_DO")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-red-100 text-[#C84040]">
                      <Droplets className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-950">1. Critical Low DO (&lt; 3.0 mg/L)</p>
                      <p className="text-xs text-red-800">Emergency aeration cascade full boost; feeding strictly halted</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#C84040] underline shrink-0 ml-2">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("GRADUAL_FALLING_DO")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-[#B7791F]">
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-950">2. Gradually Falling DO (3.9 mg/L)</p>
                      <p className="text-xs text-amber-800">Early morning oxygen sag; engages supplementary paddlewheel</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#B7791F] underline shrink-0 ml-2">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("RISING_AMMONIA")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-[#B7791F]">
                      <AlertOctagon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-950">3. Rising Ammonia (&gt; 0.18 mg/L)</p>
                      <p className="text-xs text-amber-800">Benthic organic load; cuts feed ration by 50% interlock</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#B7791F] underline shrink-0 ml-2">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("HIGH_TEMPERATURE")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-[#B7791F]">
                      <Flame className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-950">4. High Water Temperature (34.8°C)</p>
                      <p className="text-xs text-amber-800">Afternoon solar peak; triggers thermal feeding reduction</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#B7791F] underline shrink-0 ml-2">Inject</span>
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
                      <p className="text-sm font-bold text-purple-950">5. Abnormal pH Spike (8.9 pH)</p>
                      <p className="text-xs text-purple-800">Algal bloom photosynthetic spike; raises water quality warning</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-700 underline shrink-0 ml-2">Inject</span>
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
                      <p className="text-sm font-bold text-purple-950">6. Node Disconnection / Offline</p>
                      <p className="text-xs text-purple-800">Optical sensor failure; initiates conservative fail-safe aeration</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-700 underline shrink-0 ml-2">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("STALE_READINGS")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] hover:bg-[#EFF4F0] text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-[#EFF4F0] text-[#68776F]">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#172820]">7. Stale Telemetry Readings</p>
                      <p className="text-xs text-[#68776F]">Freezes values for 45 minutes; flags staleness indicator in UI</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#68776F] underline shrink-0 ml-2">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("AERATOR_FAILURE")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-red-100 text-[#C84040]">
                      <ZapOff className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-950">8. Aerator Motor Overload Trip</p>
                      <p className="text-xs text-red-800">Contactor fault; triggers redundant secondary aerator automatically</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#C84040] underline shrink-0 ml-2">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("FEEDER_FAILURE")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-[#B7791F]">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-950">9. Feeder Dispenser Jam</p>
                      <p className="text-xs text-amber-800">Auger blockage detected; flags feeder maintenance ticket</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#B7791F] underline shrink-0 ml-2">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("ABNORMAL_FEEDING_RESPONSE")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-[#3478B8]">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-950">10. Abnormal Check-Tray Intake (&lt; 30%)</p>
                      <p className="text-xs text-blue-800">Excess uneaten pellets; flags potential gut syndrome or lethargy</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#3478B8] underline shrink-0 ml-2">Inject</span>
                </button>
              </>
            )}

            {activeCategory === "disease" && (
              <>
                <button
                  disabled={loading}
                  onClick={() => handleInject("ELEVATED_DISEASE_RISK")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100/70 text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-red-100 text-[#C84040]">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-950">11. Multi-Stressor Disease Vulnerability</p>
                      <p className="text-xs text-red-800">DO dip + Temp spike + Ammonia surge; elevates WSSV/Vibrio risk score</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#C84040] underline shrink-0 ml-2">Inject</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleInject("RECOVERY")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-[#247653]/30 bg-[#E3F3E9]/50 hover:bg-[#E3F3E9] text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-[#E3F3E9] text-[#247653]">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#172820]">12. Post-Intervention Recovery</p>
                      <p className="text-xs text-[#247653]">Simulates restorative water exchange and aerator re-oxygenation</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#247653] underline shrink-0 ml-2">Inject</span>
                </button>
              </>
            )}
          </div>

          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-[#21845A]" />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E3EAE5] bg-[#F6F8F6]">
          <button
            onClick={() => handleInject("CLEAR")}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#172820] hover:bg-[#EFF4F0] transition-colors"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#247653]" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-[#247653]" />
            )}
            <span>Restore Natural Diurnal Curves</span>
          </button>
          <button
            onClick={() => setIsSimulateModalOpen(false)}
            className="btn-secondary text-xs py-2 px-4"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
