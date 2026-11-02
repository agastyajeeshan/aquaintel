import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Network,
  Wifi,
  WifiOff,
  Server,
  Cpu,
  RefreshCw,
  Send,
  ShieldAlert,
  CheckCircle2,
  Lock,
  RotateCcw,
  Radio,
  Clock,
  HardDrive
} from "lucide-react";

export const EdgeCloudHybrid: React.FC = () => {
  const [hybridStatus, setHybridStatus] = useState<any>(null);
  const [remoteCommands, setRemoteCommands] = useState<any[]>([]);
  const [syncBatches, setSyncBatches] = useState<any[]>([]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Command dispatch form
  const [targetPond, setTargetPond] = useState<number>(4);
  const [targetEquipment, setTargetEquipment] = useState<string>("AER-P04-1");
  const [equipmentType, setEquipmentType] = useState<string>("AERATOR");
  const [selectedAction, setSelectedAction] = useState<string>("START");
  const [operatorRole, setOperatorRole] = useState<string>("ADMIN");
  const operatorName = "Dr. K. Srinivas (Agritech Director)";
  const [commandTTL, setCommandTTL] = useState<number>(120);

  // Modal confirmation
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const [st, cmds, batches] = await Promise.all([
        api.getCloudHybridStatus().catch(() => null),
        api.getRemoteCommands(targetPond).catch(() => []),
        api.getCloudSyncBatches().catch(() => []),
      ]);
      if (st) setHybridStatus(st);
      if (cmds) setRemoteCommands(cmds);
      if (batches) setSyncBatches(batches);
    } catch (e) {
      console.warn("Failed to fetch edge-cloud status:", e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [targetPond]);

  const handleExecuteRemoteCommand = async () => {
    try {
      setEvaluating(true);
      const res = await api.issueRemoteCommand({
        pond_id: targetPond,
        device_id: targetEquipment,
        equipment_type: equipmentType,
        action: selectedAction,
        parameters: { reason: "Remote farmer manual actuation from mobile/cloud console" },
        operator_name: operatorName,
        user_role: operatorRole,
        ttl_seconds: commandTTL,
        confirmed_by_user: true,
      });

      setConfirmModalOpen(false);
      if (res.success) {
        setActionFeedback(`Command '${selectedAction}' acknowledged and executed on ${targetEquipment}. (ID: ${res.command_id})`);
      } else {
        setActionFeedback(`Notice: ${res.message} (Status: ${res.status})`);
      }
      fetchStatus();
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (e: any) {
      alert(`Command dispatch error: ${e.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSimulateNetwork = async (action: string) => {
    try {
      setEvaluating(true);
      const res = await api.simulateNetworkCondition({
        action,
        pond_id: targetPond,
        reading_value: 3.1,
        sensor_type: "do"
      });
      setActionFeedback(`[SIMULATION] ${res.message}`);
      fetchStatus();
      setTimeout(() => setActionFeedback(null), 6000);
    } catch (e: any) {
      alert(`Simulation failed: ${e.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleManualFlushSync = async () => {
    try {
      setEvaluating(true);
      const res = await api.triggerCloudFlushSync();
      setActionFeedback(`Buffer sync: ${res.message} (${res.synced_count} records processed in ${res.duration_ms}ms)`);
      fetchStatus();
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const isConnected = hybridStatus?.is_connected ?? true;
  const bufferCount = hybridStatus?.buffer_count ?? 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 md:p-6 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-[#E3F3E9] text-[#174D39] rounded-lg">
              <Network className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#172820] tracking-tight">
              Edge-Cloud Hybrid Architecture & Remote Farm Monitoring
            </h1>
          </div>
          <p className="text-xs md:text-sm text-[#68776F] mt-1">
            Physical edge controller autonomy, offline-first local spooling, secure TLS commands with TTL, and remote farmer visibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Farm Connectivity Pill */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold ${
            isConnected
              ? "bg-[#EBF7F0] border-[#B2D8C6] text-[#174D39]"
              : "bg-[#FFF5F5] border-[#F2C2C2] text-[#A32D2D] animate-pulse"
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-[#1E6B4C]" />
                <span>Farm Edge Uplink: ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[#A32D2D]" />
                <span>Edge Offline (Autonomous Safety Active)</span>
              </>
            )}
          </div>

          <button
            onClick={fetchStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E3EAE5] hover:bg-[#F6F8F6] text-[#172820] text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="bg-[#EBF7F0] border border-[#B2D8C6] text-[#174D39] px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#1E6B4C] shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* SECTION 1: 3-LAYER ARCHITECTURAL TOPOLOGY */}
      <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)]">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F1]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
              System Architecture
            </span>
            <h2 className="text-base font-bold text-[#172820]">
              Three-Layer Hybrid Edge-Cloud Continuum
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#1E6B4C] bg-[#E3F3E9] px-2.5 py-1 rounded-md">
            Local Safety Supremacy Guaranteed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Layer 1: Farm Edge */}
          <div className="bg-[#F9FCFA] border border-[#E3EAE5] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E3F3E9] text-[#174D39]">
                  LAYER 1 — PHYSICAL EDGE
                </span>
                <Cpu className="w-4 h-4 text-[#1E6B4C]" />
              </div>
              <h3 className="text-sm font-bold text-[#172820] mb-1">
                Farm Edge Gateway & RTUs
              </h3>
              <p className="text-xs text-[#68776F] mb-3 leading-relaxed">
                Industrial controller (Advantech UNO / CM4) connected to optical DO, pH, salinity probes, LoRa nodes, and motor contactor relays.
              </p>
              <ul className="text-xs space-y-1.5 text-[#172820]">
                <li className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B4C]" /> Continuous sub-second sensor acquisition
                </li>
                <li className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B4C]" /> Local offline hysteresis & emergency DO cascade
                </li>
                <li className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B4C]" /> Persistent SQLite offline spool buffer
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-2 border-t border-[#E3EAE5] text-[11px] text-[#68776F] flex justify-between">
              <span>Status: <strong className={isConnected ? "text-[#1E6B4C]" : "text-[#A32D2D]"}>{isConnected ? "ONLINE" : "AUTONOMOUS OFFLINE"}</strong></span>
              <span>Buffer: <strong>{bufferCount} rec</strong></span>
            </div>
          </div>

          {/* Layer 2: Cloud Core */}
          <div className="bg-[#F9FCFA] border border-[#E3EAE5] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E3F3E9] text-[#174D39]">
                  LAYER 2 — AQUAINTEL CLOUD
                </span>
                <Server className="w-4 h-4 text-[#1E6B4C]" />
              </div>
              <h3 className="text-sm font-bold text-[#172820] mb-1">
                Secure Cloud Core Backend
              </h3>
              <p className="text-xs text-[#68776F] mb-3 leading-relaxed">
                Scalable cloud platform ingesting multi-farm telemetry, executing AI forecasting models, and dispatching authenticated remote commands.
              </p>
              <ul className="text-xs space-y-1.5 text-[#172820]">
                <li className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B4C]" /> Multi-pond 72h climate adaptation forecasting
                </li>
                <li className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B4C]" /> Time-to-Live (TTL) command queue with expiry
                </li>
                <li className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B4C]" /> Idempotent SHA-256 deduplicated sync
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-2 border-t border-[#E3EAE5] text-[11px] text-[#68776F] flex justify-between">
              <span>Channel: <strong>IN865 (865.2 MHz)</strong></span>
              <span>Sync Protocol: <strong>HTTPS / TLS</strong></span>
            </div>
          </div>

          {/* Layer 3: Remote Farmer App */}
          <div className="bg-[#F9FCFA] border border-[#E3EAE5] rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E3F3E9] text-[#174D39]">
                  LAYER 3 — REMOTE APP
                </span>
                <Radio className="w-4 h-4 text-[#1E6B4C]" />
              </div>
              <h3 className="text-sm font-bold text-[#172820] mb-1">
                Anywhere Farmer Application
              </h3>
              <p className="text-xs text-[#68776F] mb-3 leading-relaxed">
                Responsive mobile and desktop client enabling real-time pond oversight, push alerts, and authenticated remote actuator commands.
              </p>
              <ul className="text-xs space-y-1.5 text-[#172820]">
                <li className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B4C]" /> Role-Based Access Control (Admin / Mgr / Tech)
                </li>
                <li className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B4C]" /> Two-step confirmation for equipment toggles
                </li>
                <li className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6B4C]" /> Real-time closed-loop equipment feedback
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-2 border-t border-[#E3EAE5] text-[11px] text-[#68776F] flex justify-between">
              <span>Operator: <strong>{operatorRole}</strong></span>
              <span>Session: <strong>Authenticated</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: GATEWAY HARDWARE STATUS & NETWORK TELEMETRY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-4 shadow-[0_2px_8px_rgba(30,60,45,0.03)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#68776F] block mb-1">
            Gateway Hardware
          </span>
          <div className="text-sm font-bold text-[#172820]">
            {hybridStatus?.hardware_model || "Advantech UNO-2271G"}
          </div>
          <p className="text-xs text-[#68776F] mt-1">
            Firmware: <span className="font-mono text-[#174D39] font-bold">{hybridStatus?.firmware_version || "v3.2.0"}</span>
          </p>
        </div>

        <div className="bg-white border border-[#E3EAE5] rounded-xl p-4 shadow-[0_2px_8px_rgba(30,60,45,0.03)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#68776F] block mb-1">
            Network & Uplink
          </span>
          <div className="text-sm font-bold text-[#172820] flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-[#1E6B4C]" : "bg-[#A32D2D] animate-ping"}`} />
            {isConnected ? "Cloud Uplink Connected" : "Local Edge Disconnected"}
          </div>
          <p className="text-xs text-[#68776F] mt-1">
            Heartbeat: <span className="font-semibold text-[#172820]">{hybridStatus?.last_heartbeat_seconds_ago ?? 2}s ago</span>
          </p>
        </div>

        <div className="bg-white border border-[#E3EAE5] rounded-xl p-4 shadow-[0_2px_8px_rgba(30,60,45,0.03)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#68776F] block mb-1">
            Edge Storage Spool
          </span>
          <div className="text-sm font-bold text-[#172820]">
            {hybridStatus?.local_storage_used_mb ?? 42.8} MB Used
          </div>
          <p className="text-xs text-[#68776F] mt-1">
            Offline Buffer: <span className="font-bold text-[#174D39]">{bufferCount} records pending</span>
          </p>
        </div>

        <div className="bg-white border border-[#E3EAE5] rounded-xl p-4 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#68776F] block mb-1">
              Data Synchronization
            </span>
            <div className="text-xs font-semibold text-[#172820]">
              {bufferCount === 0 ? "Cloud in sync with edge" : "Sync required after outage"}
            </div>
          </div>
          <button
            onClick={handleManualFlushSync}
            disabled={evaluating || bufferCount === 0}
            className="mt-2 px-3 py-1 bg-[#174D39] hover:bg-[#1E6B4C] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Flush & Sync Buffer
          </button>
        </div>
      </div>

      {/* SECTION 3: REMOTE ACTUATOR CONTROL CENTER & SAFETY LOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Remote Command Panel */}
        <div className="lg:col-span-2 bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F0F4F1] gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
                Remote Farm Control
              </span>
              <h2 className="text-base font-bold text-[#172820]">
                Authenticated Actuator Command Center
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#68776F]">Operator Role:</span>
              <select
                value={operatorRole}
                onChange={(e) => setOperatorRole(e.target.value)}
                className="bg-[#F6F8F6] border border-[#E3EAE5] rounded px-2 py-1 text-xs font-semibold text-[#172820]"
              >
                <option value="ADMIN">Agritech Director (Admin)</option>
                <option value="FARM_MANAGER">General Manager</option>
                <option value="OPERATOR">Shift Lead (Field)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Pond */}
            <div>
              <label className="text-[11px] font-bold text-[#68776F] uppercase block mb-1">
                Target Pond
              </label>
              <select
                value={targetPond}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  setTargetPond(p);
                  setTargetEquipment(`AER-P0${p}-1`);
                }}
                className="w-full bg-[#F6F8F6] border border-[#E3EAE5] rounded-lg p-2 text-xs font-semibold text-[#172820]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                  <option key={p} value={p}>
                    Pond 0{p} (1.0 Ha)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Equipment */}
            <div>
              <label className="text-[11px] font-bold text-[#68776F] uppercase block mb-1">
                Equipment Unit
              </label>
              <select
                value={targetEquipment}
                onChange={(e) => {
                  setTargetEquipment(e.target.value);
                  if (e.target.value.includes("AER")) setEquipmentType("AERATOR");
                  else if (e.target.value.includes("FEEDER")) setEquipmentType("FEEDER");
                  else setEquipmentType("PUMP");
                }}
                className="w-full bg-[#F6F8F6] border border-[#E3EAE5] rounded-lg p-2 text-xs font-semibold text-[#172820]"
              >
                <option value={`AER-P0${targetPond}-1`}>Aerator 1 (Primary Surface)</option>
                <option value={`AER-P0${targetPond}-2`}>Aerator 2 (Primary Paddle)</option>
                <option value={`AER-P0${targetPond}-3`}>Aerator 3 (Spiral Aerator)</option>
                <option value={`AER-P0${targetPond}-4`}>Aerator 4 (Emergency Standby)</option>
                <option value={`FEEDER-P0${targetPond}`}>Solar Automated Feeder</option>
                <option value={`PUMP-P0${targetPond}-IN`}>Water Inlet Pump</option>
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="text-[11px] font-bold text-[#68776F] uppercase block mb-1">
                Remote Action
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full bg-[#F6F8F6] border border-[#E3EAE5] rounded-lg p-2 text-xs font-semibold text-[#172820]"
              >
                <option value="START">START Equipment</option>
                <option value="STOP">STOP Equipment</option>
                <option value="CASCADE_ALL">100% Cascade Aeration (Emergency)</option>
                <option value="SUSPEND">SUSPEND Feeder</option>
                <option value="RESUME">RESUME Feeder</option>
                <option value="DISPENSE">DISPENSE Ration (5 kg)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#F0F4F1]">
            <div className="text-xs text-[#68776F] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#174D39]" />
              <span>Command Expiry TTL:</span>
              <select
                value={commandTTL}
                onChange={(e) => setCommandTTL(Number(e.target.value))}
                className="bg-[#F6F8F6] border border-[#E3EAE5] rounded px-2 py-0.5 text-xs text-[#172820]"
              >
                <option value={60}>60 Seconds</option>
                <option value={120}>120 Seconds (2 min)</option>
                <option value={300}>300 Seconds (5 min)</option>
              </select>
            </div>

            <button
              onClick={() => setConfirmModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2 bg-[#174D39] hover:bg-[#1E6B4C] text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" /> Dispatch Remote Command
            </button>
          </div>
        </div>

        {/* Local Safety Supremacy Callout */}
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#174D39] mb-2">
              <ShieldAlert className="w-5 h-5 text-[#1E6B4C]" />
              <h3 className="text-sm font-bold text-[#172820]">
                Local Safety Supremacy Rule
              </h3>
            </div>
            <p className="text-xs text-[#68776F] leading-relaxed mb-3">
              Section D &amp; E Mandatory Rule: <strong>Remote commands from anywhere can NEVER override physical emergency safety protection.</strong>
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[#FFF9F9] border border-[#F2C2C2] rounded-lg text-[#A32D2D] leading-tight">
                <strong>Hypoxia Protection:</strong> If DO drops &lt; 3.8 mg/L, remote commands to stop aerators are automatically rejected at the edge gateway.
              </div>
              <div className="p-2.5 bg-[#FFF9F9] border border-[#F2C2C2] rounded-lg text-[#A32D2D] leading-tight">
                <strong>Ammonia Protection:</strong> If toxic un-ionized NH3 &gt; 0.05 mg/L, remote feeder commands are blocked to prevent prawn mortality.
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-[#F0F4F1] text-[11px] text-[#68776F]">
            Edge controller runs local Modbus watchdog. Expired commands are discarded upon receipt.
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E3EAE5] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-[#174D39]">
              <Lock className="w-6 h-6 text-[#1E6B4C]" />
              <h3 className="text-base font-bold text-[#172820]">Confirm Remote Actuation</h3>
            </div>
            <p className="text-xs text-[#68776F] leading-relaxed">
              You are about to issue a remote command: <strong className="text-[#172820]">{selectedAction}</strong> on{" "}
              <strong className="text-[#172820]">{targetEquipment} (Pond 0{targetPond})</strong> as operator{" "}
              <strong className="text-[#172820]">{operatorName}</strong>.
            </p>
            <div className="bg-[#F6F8F6] p-3 rounded-lg text-xs space-y-1 text-[#68776F]">
              <div className="flex justify-between">
                <span>Command TTL:</span>
                <span className="font-semibold text-[#172820]">{commandTTL} seconds</span>
              </div>
              <div className="flex justify-between">
                <span>Edge Verification:</span>
                <span className="font-semibold text-[#1E6B4C]">Local safety interlocks active</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#68776F] hover:bg-[#F0F4F1] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRemoteCommand}
                disabled={evaluating}
                className="px-4 py-1.5 text-xs font-bold bg-[#174D39] hover:bg-[#1E6B4C] text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                Confirm & Dispatch to Edge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: INTERNET OUTAGE SIMULATION & RESILIENCE HARNESS */}
      <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F0F4F1] gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
              Resilience Validation Suite
            </span>
            <h2 className="text-base font-bold text-[#172820]">
              Network Outage & Failure Simulation Harness
            </h2>
          </div>
          <span className="text-xs text-[#68776F]">
            1-Click Interactive Validation of Section E Requirements
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            onClick={() => handleSimulateNetwork("DISCONNECT_INTERNET")}
            className="p-3 bg-[#FFF5F5] hover:bg-[#FDE8E8] border border-[#F2C2C2] rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-[#A32D2D] mb-1 flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" /> Disconnect Internet
            </span>
            <span className="text-[10px] text-[#68776F] leading-tight">
              Edge switches to offline local buffer mode.
            </span>
          </button>

          <button
            onClick={() => handleSimulateNetwork("RECONNECT_INTERNET")}
            className="p-3 bg-[#EBF7F0] hover:bg-[#D4EBDC] border border-[#B2D8C6] rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-[#174D39] mb-1 flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" /> Reconnect Internet
            </span>
            <span className="text-[10px] text-[#68776F] leading-tight">
              Flushes buffered spool idempotently to cloud.
            </span>
          </button>

          <button
            onClick={() => handleSimulateNetwork("INJECT_OFFLINE_TELEMETRY")}
            className="p-3 bg-[#F9FCFA] hover:bg-[#E3F3E9] border border-[#E3EAE5] rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-[#172820] mb-1 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-[#1E6B4C]" /> Inject Offline Data
            </span>
            <span className="text-[10px] text-[#68776F] leading-tight">
              Spools reading to local persistent queue.
            </span>
          </button>

          <button
            onClick={() => handleSimulateNetwork("TEST_UNSAFE_OVERRIDE")}
            className="p-3 bg-[#FFF9F9] hover:bg-[#FEECEC] border border-[#F2C2C2] rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-[#A32D2D] mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Test Unsafe Override
            </span>
            <span className="text-[10px] text-[#68776F] leading-tight">
              Attempts shutdown during low DO; edge blocks it.
            </span>
          </button>

          <button
            onClick={() => handleSimulateNetwork("TEST_EXPIRED_COMMAND")}
            className="p-3 bg-[#F9FCFA] hover:bg-[#E3F3E9] border border-[#E3EAE5] rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-[#172820] mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#1E6B4C]" /> Test Expired TTL
            </span>
            <span className="text-[10px] text-[#68776F] leading-tight">
              Past-due command is rejected by edge gateway.
            </span>
          </button>

          <button
            onClick={() => handleSimulateNetwork("RESET")}
            className="p-3 bg-[#F9FCFA] hover:bg-[#E3F3E9] border border-[#E3EAE5] rounded-lg text-left transition-colors flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-[#172820] mb-1 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-[#68776F]" /> Reset Network Link
            </span>
            <span className="text-[10px] text-[#68776F] leading-tight">
              Restores nominal online cloud-edge state.
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 5: LIVE REMOTE COMMAND AUDIT TRAIL & SYNC BATCHES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Remote Command Log */}
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F1]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
                Command Audit Trail
              </span>
              <h3 className="text-sm font-bold text-[#172820]">
                Remote Control Dispatch & Execution Status
              </h3>
            </div>
            <span className="text-xs text-[#68776F]">
              Recent {remoteCommands.length} commands
            </span>
          </div>

          <div className="space-y-3 mt-3 overflow-y-auto max-h-[380px] pr-1">
            {remoteCommands.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#68776F]">
                No remote commands recorded yet.
              </div>
            ) : (
              remoteCommands.map((cmd) => {
                const isAck = cmd.status === "EXECUTED_ACK";
                const isBlocked = cmd.status.includes("REJECTED") || cmd.status === "EXPIRED" || cmd.status === "MOTOR_FAULT_TRIPPED";
                return (
                  <div
                    key={cmd.command_id}
                    className="p-3 bg-[#F9FCFA] border border-[#E3EAE5] rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#172820]">{cmd.device_id}</span>
                        <span className="text-[10px] bg-[#E3EAE5] px-1.5 py-0.5 rounded font-mono font-bold text-[#172820]">
                          {cmd.action}
                        </span>
                        <span className="text-[11px] text-[#68776F]">Pond 0{cmd.pond_id}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAck
                            ? "bg-[#E3F3E9] text-[#174D39]"
                            : isBlocked
                            ? "bg-[#FFF5F5] text-[#A32D2D]"
                            : "bg-[#FFF9E6] text-[#B7791F]"
                        }`}
                      >
                        {cmd.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-[#68776F]">
                      <span>CMD: {cmd.command_id}</span>
                      <span>By: {cmd.issued_by_user}</span>
                    </div>

                    {cmd.rejection_reason && (
                      <p className="text-[11px] text-[#A32D2D] bg-[#FFF5F5] p-2 rounded leading-tight">
                        {cmd.rejection_reason}
                      </p>
                    )}

                    <div className="flex justify-between text-[10px] text-[#68776F] pt-1 border-t border-[#E3EAE5]/60">
                      <span>Issued: {cmd.issued_at ? new Date(cmd.issued_at).toLocaleTimeString() : "Now"}</span>
                      <span>Feedback: {cmd.equipment_feedback || "None"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Idempotent Cloud Sync Batches */}
        <div className="bg-white border border-[#E3EAE5] rounded-xl p-5 shadow-[0_2px_8px_rgba(30,60,45,0.03)] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F1]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#68776F]">
                Cloud Synchronization Log
              </span>
              <h3 className="text-sm font-bold text-[#172820]">
                Idempotent Batch Resync History
              </h3>
            </div>
            <span className="text-xs text-[#68776F]">
              Recent {syncBatches.length} batches
            </span>
          </div>

          <div className="space-y-3 mt-3 overflow-y-auto max-h-[380px] pr-1">
            {syncBatches.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#68776F]">
                No sync batches recorded yet.
              </div>
            ) : (
              syncBatches.map((b) => (
                <div
                  key={b.batch_id}
                  className="p-3 bg-[#F9FCFA] border border-[#E3EAE5] rounded-lg text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#172820]">{b.batch_id}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F3E9] text-[#174D39]">
                      {b.status}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-[#68776F]">
                    <span>Type: <strong>{b.record_type}</strong></span>
                    <span>Count: <strong>{b.record_count} records</strong></span>
                    <span>Latency: <strong>{b.duration_ms}ms</strong></span>
                  </div>

                  <div className="text-[10px] text-[#68776F] font-mono truncate">
                    Hash: {b.idempotency_hash || "sha256_reconciled"}
                  </div>

                  <div className="text-[10px] text-[#68776F] pt-1 border-t border-[#E3EAE5]/60 flex justify-between">
                    <span>Gateway: {b.gateway_id}</span>
                    <span>Synced: {b.synced_at ? new Date(b.synced_at).toLocaleTimeString() : "Recent"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
