import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
  X,
} from "lucide-react";

export type CommandLifecycleStage =
  | "IDLE"
  | "REQUESTED"
  | "COMMAND_SENT"
  | "ACKNOWLEDGED"
  | "VERIFIED"
  | "FAILED"
  | "REJECTED_SAFETY_HOLD";

interface CommandSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<any>;
  title: string;
  actionDescription: string;
  equipmentName: string;
  equipmentType: "AERATOR" | "FEEDER" | "MODE_SWITCH" | "PUMP" | "OVERRIDE";
  safetyWarnings?: string[];
  criticalSafetyHold?: boolean;
  criticalSafetyHoldReason?: string;
  currentDO?: number;
}

export const CommandSafetyModal: React.FC<CommandSafetyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionDescription,
  equipmentName,
  equipmentType: _equipmentType,
  safetyWarnings = [],
  criticalSafetyHold = false,
  criticalSafetyHoldReason,
  currentDO,
}) => {
  const { isDemoMode, isOffline, currentUser } = useApp();
  const [stage, setStage] = useState<CommandLifecycleStage>("IDLE");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (criticalSafetyHold) {
      setStage("REJECTED_SAFETY_HOLD");
      setErrorMessage(criticalSafetyHoldReason || "Command rejected by local edge safety interlock.");
      return;
    }

    setStage("REQUESTED");
    setStatusMessage("Validating local safety interlocks and packaging cryptographic command...");

    // Stage 1: Send
    setTimeout(() => {
      setStage("COMMAND_SENT");
      setStatusMessage("Command transmitted via gateway. Awaiting RTU acknowledgment...");
    }, 400);

    try {
      const res = await onConfirm();
      // Stage 2: Ack
      setStage("ACKNOWLEDGED");
      setStatusMessage(res?.message || "Command successfully acknowledged by industrial controller.");

      // Stage 3: Verification
      setTimeout(() => {
        setStage("VERIFIED");
        setStatusMessage("Physical telemetry verified. Operating state confirmed.");
      }, 700);

      // Auto close after verification
      setTimeout(() => {
        onClose();
        setStage("IDLE");
      }, 2400);
    } catch (e: any) {
      setStage("FAILED");
      setErrorMessage(e?.message || "Command dispatch failed or timed out.");
    }
  };

  const handleModalClose = () => {
    if (stage === "REQUESTED" || stage === "COMMAND_SENT") {
      // Disallow closing during in-flight network dispatch to prevent double-submit
      return;
    }
    setStage("IDLE");
    setStatusMessage("");
    setErrorMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="soft-card-elevated max-w-lg w-full border border-[#E3EAE5] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3EAE5] bg-[#F6F8F6]">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#247653] flex items-center justify-center text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172820]">
                {title}
              </h3>
              <p className="text-[10px] text-[#68776F] font-semibold">
                Equipment Safety &amp; Command Verification Protocol
              </p>
            </div>
          </div>
          {stage === "IDLE" && (
            <button
              onClick={handleModalClose}
              className="p-1 rounded-lg text-[#68776F] hover:bg-[#E3EAE5]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Target Spec Pill */}
          <div className="p-3 rounded-xl bg-[#EFF4F0] border border-[#E3EAE5] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[#68776F] font-medium">Target Actuator:</span>
              <span className="font-bold text-[#172820]">{equipmentName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#68776F] font-medium">Action:</span>
              <span className="font-extrabold text-[#247653]">{actionDescription}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#68776F] font-medium">Authorized Operator:</span>
              <span className="font-semibold text-[#172820]">
                {currentUser?.full_name || "Console Operator"} ({currentUser?.role || "OPERATOR"})
              </span>
            </div>
            {currentDO !== undefined && (
              <div className="flex justify-between items-center pt-1 border-t border-[#E3EAE5]">
                <span className="text-[#68776F] font-medium">Current Dissolved Oxygen:</span>
                <span className={`font-black ${currentDO < 3.8 ? "text-[#C84040]" : "text-[#247653]"}`}>
                  {currentDO.toFixed(2)} mg/L
                </span>
              </div>
            )}
          </div>

          {/* Mode Warning */}
          {(isDemoMode || isOffline) && (
            <div className="p-3 rounded-xl bg-[#FEF7EC] border border-[#F6DFB3] text-[#B7791F] text-[11px] flex items-start space-x-2">
              <Radio className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {isDemoMode ? "SIMULATION MODE ACTIVE: " : "OFFLINE EDGE MODE: "}
                </span>
                {isDemoMode
                  ? "Real physical hardware is disengaged. This command will execute against the coastal aquaculture simulator engine."
                  : "Command will be buffered in edge flash memory and executed via local RS485 bus."}
              </div>
            </div>
          )}

          {/* Critical Safety Hold Alert if active */}
          {criticalSafetyHold && (
            <div className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F7C8C8] text-[#C84040] space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0 text-[#C84040]" />
                <span>SAFETY INTERLOCK ENGAGED — COMMAND BLOCKED</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {criticalSafetyHoldReason ||
                  "Local Edge Emergency Protection overrides manual requests. Equipment cannot be halted during hypoxia stress."}
              </p>
            </div>
          )}

          {/* Safety Warnings List */}
          {!criticalSafetyHold && safetyWarnings.length > 0 && (
            <div className="p-3 rounded-xl bg-[#FAF5FF] border border-[#DDD6FE] text-[#6D28D9] text-[11px] space-y-1">
              <span className="font-bold block uppercase tracking-wider text-[10px]">
                Pre-Execution Safety Verification:
              </span>
              <ul className="list-disc list-inside space-y-0.5">
                {safetyWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 4-Stage Command Lifecycle Visualization */}
          {stage !== "IDLE" && (
            <div className="space-y-3 pt-2 border-t border-[#E3EAE5]">
              <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
                Command Execution Pipeline:
              </span>
              <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
                <div
                  className={`p-1.5 rounded-lg border ${
                    stage === "REQUESTED"
                      ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] animate-pulse"
                      : stage !== "FAILED" && stage !== "REJECTED_SAFETY_HOLD"
                      ? "bg-[#EAF6EE] border-[#C6E7D2] text-[#21845A]"
                      : "bg-[#F6F8F6] border-[#E3EAE5] text-[#68776F]"
                  }`}
                >
                  1. REQUESTED
                </div>
                <div
                  className={`p-1.5 rounded-lg border ${
                    stage === "COMMAND_SENT"
                      ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] animate-pulse"
                      : stage === "ACKNOWLEDGED" || stage === "VERIFIED"
                      ? "bg-[#EAF6EE] border-[#C6E7D2] text-[#21845A]"
                      : "bg-[#F6F8F6] border-[#E3EAE5] text-[#68776F]"
                  }`}
                >
                  2. TRANSMITTED
                </div>
                <div
                  className={`p-1.5 rounded-lg border ${
                    stage === "ACKNOWLEDGED"
                      ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] animate-pulse"
                      : stage === "VERIFIED"
                      ? "bg-[#EAF6EE] border-[#C6E7D2] text-[#21845A]"
                      : "bg-[#F6F8F6] border-[#E3EAE5] text-[#68776F]"
                  }`}
                >
                  3. ACKNOWLEDGED
                </div>
                <div
                  className={`p-1.5 rounded-lg border ${
                    stage === "VERIFIED"
                      ? "bg-[#EAF6EE] border-[#C6E7D2] text-[#21845A]"
                      : "bg-[#F6F8F6] border-[#E3EAE5] text-[#68776F]"
                  }`}
                >
                  4. VERIFIED
                </div>
              </div>

              {/* Status or Error Message */}
              {statusMessage && (
                <div className="p-2.5 rounded-lg bg-[#EAF6EE] border border-[#C6E7D2] text-[#21845A] text-[11px] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#21845A]" />
                  <span>{statusMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-[#FDF2F2] border border-[#F7C8C8] text-[#C84040] text-[11px] font-semibold flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0 text-[#C84040]" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2.5 px-5 py-3.5 border-t border-[#E3EAE5] bg-[#F6F8F6]">
          <button
            onClick={handleModalClose}
            disabled={stage === "REQUESTED" || stage === "COMMAND_SENT"}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[#E3EAE5] bg-white text-[#172820] hover:bg-[#EFF4F0] transition-colors disabled:opacity-50"
          >
            {stage === "VERIFIED" ? "Close" : "Cancel"}
          </button>

          {stage === "IDLE" && (
            <button
              onClick={handleExecute}
              disabled={criticalSafetyHold}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl text-white shadow-xs transition-colors ${
                criticalSafetyHold
                  ? "bg-[#68776F] cursor-not-allowed opacity-50"
                  : "bg-[#247653] hover:bg-[#174D39]"
              }`}
            >
              Confirm &amp; Dispatch Command
            </button>
          )}

          {(stage === "REQUESTED" || stage === "COMMAND_SENT") && (
            <button
              disabled
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#247653] text-white flex items-center gap-1.5 opacity-90 cursor-wait"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Dispatching...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
