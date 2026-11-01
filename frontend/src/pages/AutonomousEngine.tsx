import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Bot,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  Wifi,
  WifiOff,
  Cpu,
  RefreshCw,
  Send,
  Zap,
  Eye,
  Lock,
  Clock,
  Radio,
  FileCheck,
} from "lucide-react";

export const AutonomousEngine: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [safetyConfig, setSafetyConfig] = useState<any>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [selectedPond, setSelectedPond] = useState<number>(4);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [modeConfirmModal, setModeConfirmModal] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [st, dec, act, notif, cfg] = await Promise.all([
        api.getAutonomousStatus().catch(() => null),
        api.getAutonomousDecisions(undefined, 20).catch(() => []),
        api.getAutonomousActions(undefined, 20).catch(() => []),
        api.getAutonomousNotifications(undefined, 20).catch(() => []),
        api.getAutonomousSafetyConfig().catch(() => null),
      ]);
      if (st) setStatus(st);
      if (dec) setDecisions(dec);
      if (act) setActions(act);
      if (notif) setNotifications(notif);
      if (cfg) setSafetyConfig(cfg);
    } catch (e) {
      console.error("Error loading autonomous data:", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleModeChange = async (newMode: string) => {
    try {
      await api.setAutonomousMode(newMode, "Farm General Manager", "Console operator selection");
      setActionFeedback(`Operating mode updated to ${newMode}`);
      setModeConfirmModal(null);
      fetchData();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (e: any) {
      alert(`Failed to change mode: ${e.message}`);
    }
  };

  const handleTriggerEvaluate = async () => {
    try {
      setEvaluating(true);
      const res = await api.triggerAutonomousEvaluate();
      setActionFeedback(`Fleet evaluation completed: ${res.events_generated_count} events assessed.`);
      fetchData();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (e: any) {
      alert(`Evaluation failed: ${e.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleManualOverride = async (action: string) => {
    try {
      const res = await api.manualAutonomousOverride(action, selectedPond, "Dr. K. Srinivas");
      setActionFeedback(res.message);
      fetchData();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (e: any) {
      alert(`Override failed: ${e.message}`);
    }
  };

  const handleSimulateScenario = async (scenario: string) => {
    try {
      const res = await api.simulateAutonomousScenario(scenario, selectedPond);
      setActionFeedback(`[SIMULATION] ${res.message}`);
      fetchData();
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (e: any) {
      alert(`Simulation failed: ${e.message}`);
    }
  };

  const handleVerifyAction = async (actionId: string) => {
    try {
      const res = await api.verifyAutonomousAction(actionId);
      if (res.recovery_verified) {
        setActionFeedback(`Action ${actionId} recovery confirmed! DO reading: ${res.current_reading} mg/L`);
      } else {
        setActionFeedback(`Action ${actionId} recovery pending. DO: ${res.current_reading} mg/L (target >= ${res.target_threshold})`);
      }
      fetchData();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (e: any) {
      alert(`Verification check failed: ${e.message}`);
    }
  };

  const currentMode = status?.operating_mode || "AUTOMATIC_SAFETY";

  const modeDescriptions: Record<string, { label: string; desc: string; badge: string; color: string }> = {
    MONITOR: {
      label: "Monitor Mode",
      desc: "Continuous telemetry monitoring and alerts only. No physical equipment commands dispatched.",
      badge: "OBSERVATION ONLY",
      color: "border-[#D1DCD6] text-[#47544E] bg-white",
    },
    ASSISTED: {
      label: "Assisted Mode",
      desc: "AI recommendations generated; operator must explicitly authorize any physical actuations.",
      badge: "HUMAN-IN-THE-LOOP",
      color: "border-[#B2D8C6] text-[#1E6B4C] bg-white",
    },
    AUTOMATIC_SAFETY: {
      label: "Automatic Safety Mode",
      desc: "Pre-authorized emergency actions (hypoxia cascade, backup aerator failover, feeder lockout) execute autonomously.",
      badge: "ACTIVE PROTECTION",
      color: "border-[#1E6B4C] text-[#174D39] bg-[#EBF7F0]",
    },
    FULL_AUTOMATION: {
      label: "Full Automation Mode",
      desc: "Comprehensive equipment control operates autonomously under strict validation and safety interlocks.",
      badge: "AUTONOMOUS GOVERNANCE",
      color: "border-[#13422E] text-[#0E3524] bg-[#E3F3E9]",
    },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 md:p-6 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-[#E3F3E9] text-[#174D39] rounded-lg">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#172820] tracking-tight">
              Autonomous Farm Management Engine
            </h1>
          </div>
          <p className="text-xs md:text-sm text-[#68776F] mt-1">
            Condition-based monitoring, multi-parameter risk intelligence, safe automatic actuation, and closed-loop verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F6F8F6] border border-[#E3EAE5] rounded-lg text-xs font-semibold text-[#172820]">
            {status?.cloud_connected ? (
              <span className="flex items-center gap-1.5 text-[#1E6B4C]">
                <Wifi className="w-3.5 h-3.5" /> Edge & Cloud Synced
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#A32D2D]">
                <WifiOff className="w-3.5 h-3.5" /> Cloud Disconnected (Edge Safeguard Active)
              </span>
            )}
          </div>

          <button
            onClick={handleTriggerEvaluate}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#174D39] hover:bg-[#1E6B4C] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? "animate-spin" : ""}`} />
            Run Fleet Assessment
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="bg-[#EBF7F0] border border-[#B2D8C6] text-[#174D39] px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#1E6B4C] shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* SECTION 1: PROMINENT OPERATING MODE SELECTOR */}
      <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F0F4F1] gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
              Autonomous Operating Mode
            </span>
            <h2 className="text-base font-bold text-[#172820]">
              Current Farm Governance: <span className="text-[#174D39]">{modeDescriptions[currentMode]?.label}</span>
            </h2>
          </div>
          <span className="text-xs text-[#68776F]">
            Last changed by: <span className="font-semibold text-[#172820]">{status?.changed_by || "System Initializer"}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {Object.entries(modeDescriptions).map(([modeKey, info]) => {
            const isSelected = currentMode === modeKey;
            return (
              <div
                key={modeKey}
                onClick={() => {
                  if (!isSelected) setModeConfirmModal(modeKey);
                }}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between ${
                  isSelected
                    ? `${info.color} ring-2 ring-[#174D39]/20 shadow-sm`
                    : "border-[#E3EAE5] bg-white hover:border-[#B2D8C6] hover:bg-[#F9FCFA]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold tracking-tight text-[#172820]">
                      {info.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-[#174D39] text-white"
                          : "bg-[#F0F4F1] text-[#68776F]"
                      }`}
                    >
                      {info.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#68776F] leading-relaxed mb-3">
                    {info.desc}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#E3EAE5]/60 flex items-center justify-between text-xs font-semibold">
                  <span className={isSelected ? "text-[#174D39]" : "text-[#68776F]"}>
                    {isSelected ? "Active Mode" : "Switch to Mode"}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#1E6B4C]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {modeConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E3EAE5] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-[#174D39]">
              <ShieldAlert className="w-6 h-6 text-[#1E6B4C]" />
              <h3 className="text-base font-bold text-[#172820]">Confirm Mode Change</h3>
            </div>
            <p className="text-xs text-[#68776F] leading-relaxed">
              Are you sure you want to change the autonomous operating mode to{" "}
              <strong className="text-[#172820]">{modeDescriptions[modeConfirmModal]?.label}</strong>?
              This will update safety interlocks and equipment command dispatch rules across all 10 ponds.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModeConfirmModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#68776F] hover:bg-[#F0F4F1] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleModeChange(modeConfirmModal)}
                className="px-4 py-1.5 text-xs font-semibold bg-[#174D39] hover:bg-[#1E6B4C] text-white rounded-lg transition-colors shadow-sm"
              >
                Confirm Authorization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: CLOSED-LOOP VERIFICATION ARCHITECTURE */}
      <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)]">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F1]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
              Execution Architecture
            </span>
            <h2 className="text-base font-bold text-[#172820]">
              Closed-Loop Operational Lifecycle
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#1E6B4C] bg-[#E3F3E9] px-2.5 py-1 rounded-md">
            Deterministic Protection Active
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-4">
          {[
            { step: "1", title: "Continuous Monitoring", desc: "Multi-sensor sanity & staleness checks", icon: Eye },
            { step: "2", title: "Risk Assessment", desc: "Emerson NH3 & multi-parameter evaluation", icon: Cpu },
            { step: "3", title: "Action Selection", desc: "Pre-authorized safety rules & interlocks", icon: ShieldCheck },
            { step: "4", title: "Command Dispatch", desc: "Anti-cycling hysteresis & secure dispatch", icon: Send },
            { step: "5", title: "Relay Confirmation", desc: "Motor feedback & fault trip failover", icon: Radio },
            { step: "6", title: "Recovery Verified", desc: "Sensors confirm pond parameter restoration", icon: FileCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-[#F9FCFA] border border-[#E3EAE5] rounded-lg p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#174D39] bg-[#E3F3E9] w-5 h-5 rounded-full flex items-center justify-center">
                      {item.step}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-[#1E6B4C]" />
                  </div>
                  <h4 className="text-xs font-bold text-[#172820] mb-1">{item.title}</h4>
                  <p className="text-[11px] text-[#68776F] leading-tight">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: MULTI-PARAMETER RISK INTELLIGENCE & SAFETY INTERLOCKS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Emerson Toxic Ammonia Intelligence */}
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
                Chemical Risk Engine
              </span>
              <span className="text-[10px] font-semibold bg-[#E3F3E9] text-[#174D39] px-2 py-0.5 rounded">
                Emerson et al. (1975)
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#172820] mb-1">
              Un-Ionized Ammonia (NH₃) Equilibrium
            </h3>
            <p className="text-xs text-[#68776F] mb-4">
              Couples TAN, water temperature, and electrochemical pH to calculate acute toxic ammonia fraction.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F0F4F1]">
                <span className="text-[#68776F]">Critical NH₃ Toxicity Threshold:</span>
                <span className="font-semibold text-[#172820]">
                  {safetyConfig?.unionized_nh3_critical_mg_l || 0.05} mg/L
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F1]">
                <span className="text-[#68776F]">Primary TAN Safety Ceiling:</span>
                <span className="font-semibold text-[#172820]">
                  {safetyConfig?.tan_critical_mg_l || 0.50} mg/L
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F1]">
                <span className="text-[#68776F]">Automated Safeguard Action:</span>
                <span className="font-semibold text-[#A32D2D]">Instant Feeder Suspension</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-[#F6F8F6] border border-[#E3EAE5] rounded-lg text-[11px] text-[#68776F]">
            Proven formula: <code className="text-[#174D39]">pKa = 0.09018 + 2729.92/(273.15+T)</code>. Prevents lethal toxic spikes during midday pH rises.
          </div>
        </div>

        {/* Hypoxia & Thermal-DO Coupling */}
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
                Aeration & Thermal Safety
              </span>
              <span className="text-[10px] font-semibold bg-[#EBF7F0] text-[#1E6B4C] px-2 py-0.5 rounded">
                Hysteresis Control
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#172820] mb-1">
              Hypoxic Cascade & Backup Failover
            </h3>
            <p className="text-xs text-[#68776F] mb-4">
              Automatic 100% aerator engagement with instant failover to backup aerators if motor trip occurs.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F0F4F1]">
                <span className="text-[#68776F]">Emergency DO Trigger:</span>
                <span className="font-semibold text-[#A32D2D]">
                  &lt; {safetyConfig?.emergency_do_threshold || 3.5} mg/L
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F1]">
                <span className="text-[#68776F]">Recovery Target (Hysteresis):</span>
                <span className="font-semibold text-[#1E6B4C]">
                  &gt; {safetyConfig?.target_do_recovery || 5.5} mg/L
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F1]">
                <span className="text-[#68776F]">Min Run Time / Min Rest Time:</span>
                <span className="font-semibold text-[#172820]">
                  {safetyConfig?.min_on_seconds || 600}s / {safetyConfig?.min_off_seconds || 300}s
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-[#F6F8F6] border border-[#E3EAE5] rounded-lg text-[11px] text-[#68776F]">
            Anti-cycling protection guarantees equipment motors are never stressed by repeated on/off oscillation.
          </div>
        </div>

        {/* Hard Rules & Flood Safeguards */}
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
                Deterministic Guardrails
              </span>
              <span className="text-[10px] font-semibold bg-[#F9EBEB] text-[#A32D2D] px-2 py-0.5 rounded">
                Hard Block Active
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#172820] mb-1">
              Safety Locks & Interlocks
            </h3>
            <p className="text-xs text-[#68776F] mb-4">
              Hard-coded policy enforcement ensuring high-risk physical actions cannot trigger without human authorization.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F0F4F1]">
                <span className="text-[#68776F]">Autonomous Chemical Dosing:</span>
                <span className="font-bold text-[#A32D2D] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Strictly Blocked
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F1]">
                <span className="text-[#68776F]">Forecast-Only Pond Drain:</span>
                <span className="font-bold text-[#A32D2D] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Prohibited
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F1]">
                <span className="text-[#68776F]">Heavy Rain Safeguard:</span>
                <span className="font-semibold text-[#172820]">Destratification Aeration Only</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-[#F6F8F6] border border-[#E3EAE5] rounded-lg text-[11px] text-[#68776F]">
            Section 5 Compliance: Probiotics, formalin, and medicines require veterinary prescription sign-off.
          </div>
        </div>
      </div>

      {/* SECTION 4: MANUAL OVERRIDE & SCENARIO TESTING BAR */}
      <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F4F1]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
              Operator Controls & Validation Suite
            </span>
            <h2 className="text-base font-bold text-[#172820]">
              Manual Safety Overrides & Interactive Scenario Tests
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#68776F]">Target Pond:</span>
            <select
              value={selectedPond}
              onChange={(e) => setSelectedPond(Number(e.target.value))}
              className="text-xs font-semibold bg-[#F6F8F6] border border-[#E3EAE5] rounded-lg px-2.5 py-1 text-[#172820]"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                <option key={p} value={p}>
                  Pond 0{p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Manual Emergency Overrides */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#68776F]">
            Manual Emergency Overrides (Instant Hardware Action)
          </span>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handleManualOverride("CASCADE_AERATION_ALL")}
              className="px-3.5 py-1.5 bg-[#174D39] hover:bg-[#1E6B4C] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" /> 100% Cascade Aeration (Pond 0{selectedPond})
            </button>
            <button
              onClick={() => handleManualOverride("LOCKOUT_ALL_FEEDERS")}
              className="px-3.5 py-1.5 bg-[#A32D2D] hover:bg-[#B83838] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" /> Emergency Feeder Lockout
            </button>
            <button
              onClick={() => handleManualOverride("RESUME_ALL_FEEDERS")}
              className="px-3.5 py-1.5 bg-white border border-[#E3EAE5] hover:bg-[#F6F8F6] text-[#172820] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-[#1E6B4C]" /> Resume Feeding
            </button>
            <button
              onClick={() => handleManualOverride("RESET_SAFETY")}
              className="px-3.5 py-1.5 bg-white border border-[#E3EAE5] hover:bg-[#F6F8F6] text-[#68776F] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Trip Flags
            </button>
          </div>
        </div>

        {/* Interactive Scenario Injector */}
        <div className="space-y-2 pt-2 border-t border-[#F0F4F1]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#68776F]">
            Condition Simulation Suite (Demonstrates Autonomous Logic)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: "CRITICAL_DO_FAILOVER", label: "Hypoxia & Backup Failover", desc: "Trips Aerator 1 -> Engages Backup" },
              { id: "TOXIC_AMMONIA_SURGE", label: "Toxic Ammonia Surge", desc: "TAN 0.22 @ pH 8.7 -> Feeder Cutoff" },
              { id: "HEAVY_RAIN_FLOOD", label: "Heavy Rain & Salinity Drop", desc: "Surge rain -> Destratification" },
              { id: "CHEMICAL_DOSING_REQUEST", label: "Chemical Dosing Request", desc: "Hard safety lock blocks action" },
              { id: "CLOUD_DISCONNECT", label: "Cloud Outage Simulation", desc: "Local edge continues safety loop" },
              { id: "RESET", label: "Reset All Faults", desc: "Restores nominal telemetry" },
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleSimulateScenario(sc.id)}
                className="p-2.5 bg-[#F9FCFA] hover:bg-[#E3F3E9] border border-[#E3EAE5] hover:border-[#1E6B4C] rounded-lg text-left transition-colors flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-[#172820] mb-0.5">{sc.label}</span>
                <span className="text-[10px] text-[#68776F] leading-tight">{sc.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5: LIVE CLOSED-LOOP ACTIONS & VERIFICATION TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Closed-Loop Action Records */}
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F1]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
                Hardware Feedback
              </span>
              <h3 className="text-sm font-bold text-[#172820]">
                Closed-Loop Action Records & Acknowledgements
              </h3>
            </div>
            <span className="text-xs text-[#68776F]">
              Recent {actions.length} commands
            </span>
          </div>

          <div className="space-y-3 mt-3 overflow-y-auto max-h-[420px] pr-1">
            {actions.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#68776F]">
                No physical actuation commands dispatched yet in this session.
              </div>
            ) : (
              actions.map((act) => {
                const isTripped = act.equipment_ack_status === "MOTOR_FAULT_TRIPPED";
                const isVerified = act.recovery_verified;
                return (
                  <div
                    key={act.action_id}
                    className="p-3 bg-[#F9FCFA] border border-[#E3EAE5] rounded-lg text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#172820]">
                          {act.equipment_code}
                        </span>
                        <span className="text-[10px] bg-[#E3EAE5] text-[#172820] px-1.5 py-0.5 rounded font-mono">
                          {act.command_action}
                        </span>
                        <span className="text-[11px] text-[#68776F]">
                          Pond 0{act.pond_id}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isTripped
                            ? "bg-[#F9EBEB] text-[#A32D2D]"
                            : "bg-[#E3F3E9] text-[#174D39]"
                        }`}
                      >
                        {act.equipment_ack_status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#68776F] pt-1 border-t border-[#E3EAE5]/60">
                      <span>CMD: {act.command_id}</span>
                      <span>
                        {act.dispatched_at
                          ? new Date(act.dispatched_at).toLocaleTimeString()
                          : "Just now"}
                      </span>
                    </div>

                    {act.notes && (
                      <p className="text-[11px] text-[#A32D2D] bg-[#F9EBEB] p-1.5 rounded">
                        {act.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] flex items-center gap-1 text-[#68776F]">
                        Recovery:{" "}
                        {isVerified ? (
                          <span className="text-[#1E6B4C] font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
                          </span>
                        ) : (
                          <span className="text-[#A32D2D] font-semibold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> PENDING
                          </span>
                        )}
                      </span>
                      {!isVerified && !isTripped && (
                        <button
                          onClick={() => handleVerifyAction(act.action_id)}
                          className="px-2 py-0.5 bg-white border border-[#E3EAE5] hover:bg-[#E3F3E9] text-[10px] font-semibold text-[#174D39] rounded transition-colors"
                        >
                          Verify Recovery
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Standardized Notification Feed */}
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F1]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
                Audit & Alert Dispatch
              </span>
              <h3 className="text-sm font-bold text-[#172820]">
                Standardized Farmer Notifications
              </h3>
            </div>
            <span className="text-xs text-[#68776F]">
              Recent {notifications.length}
            </span>
          </div>

          <div className="space-y-3 mt-3 overflow-y-auto max-h-[420px] pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#68776F]">
                No autonomous alerts logged yet in this session.
              </div>
            ) : (
              notifications.map((notif) => {
                const isCrit = notif.severity === "EMERGENCY" || notif.severity === "CRITICAL";
                return (
                  <div
                    key={notif.notification_id}
                    className={`p-3 border rounded-lg text-xs space-y-1.5 ${
                      isCrit
                        ? "bg-[#FFF9F9] border-[#F2C2C2]"
                        : "bg-[#F9FCFA] border-[#E3EAE5]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCrit
                              ? "bg-[#A32D2D] text-white"
                              : "bg-[#E3F3E9] text-[#174D39]"
                          }`}
                        >
                          {notif.severity}
                        </span>
                        <span className="font-bold text-[#172820]">{notif.title}</span>
                      </div>
                      <span className="text-[10px] text-[#68776F]">
                        {notif.timestamp
                          ? new Date(notif.timestamp).toLocaleTimeString()
                          : "Now"}
                      </span>
                    </div>

                    <p className="text-xs text-[#68776F] leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.structured_payload && (
                      <div className="bg-white/80 border border-[#E3EAE5]/60 rounded p-2 text-[11px] space-y-1 mt-1">
                        <div className="flex justify-between">
                          <span className="text-[#68776F]">Action Taken:</span>
                          <span className="font-semibold text-[#172820]">
                            {notif.structured_payload.automatic_action_taken}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#68776F]">Recommended Next Steps:</span>
                          <span className="font-semibold text-[#1E6B4C]">
                            {notif.structured_payload.recommended_next_steps}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#68776F] pt-1 border-t border-[#E3EAE5]/40">
                          <span>Channels: {notif.channel}</span>
                          <span>Escalation: Level {notif.escalation_level}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SECTION 6: DECISION AUDIT TIMELINE */}
      <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)]">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F1]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
              Governance Audit Trail
            </span>
            <h3 className="text-base font-bold text-[#172820]">
              Autonomous Decision History & Multi-Parameter Rationale
            </h3>
          </div>
          <span className="text-xs text-[#68776F]">
            Tamper-evident logs: {decisions.length} events
          </span>
        </div>

        <div className="divide-y divide-[#F0F4F1] mt-2">
          {decisions.slice(0, 10).map((dec) => (
            <div key={dec.event_id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#172820]">Pond 0{dec.pond_id}</span>
                  <span className="text-[10px] font-mono text-[#68776F]">{dec.event_id}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F0F4F1] text-[#172820]">
                    {dec.condition_type}
                  </span>
                </div>
                <p className="text-xs text-[#68776F] line-clamp-1">{dec.decision_rationale}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-semibold text-[#174D39] bg-[#E3F3E9] px-2 py-0.5 rounded">
                  {dec.selected_action}
                </span>
                <span className="text-[10px] text-[#68776F]">
                  {dec.created_at ? new Date(dec.created_at).toLocaleTimeString() : "Recent"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
