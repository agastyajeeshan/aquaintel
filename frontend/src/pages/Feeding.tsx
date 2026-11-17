import React, { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import {
  ShieldAlert,
  CheckCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { CommandSafetyModal } from "../components/CommandSafetyModal";

interface FeederSummary {
  today_feed_kg?: number;
  recommended_feed_kg?: number;
  feed_consumed_kg?: number;
  feed_remaining_kg?: number;
  fcr?: number;
  feeding_efficiency_pct?: number;
}

interface FeederItem {
  id: number;
  pond_id: number;
  pond_number?: number;
  pond_name?: string;
  feeder_code: string;
  name: string;
  status: string;
  hopper_capacity_kg?: number;
  current_feed_level_kg?: number;
  daily_quota_kg?: number;
  dispensed_today_kg?: number;
  recommended_today_kg?: number;
  reduction_reason?: string | null;
  reduction_percentage?: number;
  next_feeding_time?: string;
  pond_do?: number;
  pond_temp?: number;
  is_blocked?: boolean;
  block_reason?: string | null;
}

export const Feeding: React.FC = () => {
  const [feedingData, setFeedingData] = useState<{
    summary?: FeederSummary;
    feeders?: FeederItem[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string>("");

  const [safetyModal, setSafetyModal] = useState<{
    isOpen: boolean;
    feeder: FeederItem | null;
    action: string;
    amountKg: number;
  }>({
    isOpen: false,
    feeder: null,
    action: "",
    amountKg: 2.5,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getFeedingStatus();
      setFeedingData(res);
    } catch (e: any) {
      console.warn("Failed to load feeding status:", e);
      setError(e?.message || "Failed to load feeder fleet telemetry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const triggerFeederSafetyModal = (
    feeder: FeederItem,
    action: string,
    amountKg: number = 2.5
  ) => {
    setSafetyModal({
      isOpen: true,
      feeder,
      action,
      amountKg,
    });
  };

  const handleExecuteFeederControl = async () => {
    if (!safetyModal.feeder) return;
    const res = await api.controlFeeder(
      safetyModal.feeder.id,
      safetyModal.action,
      safetyModal.amountKg
    );
    setActionMsg(res.message);
    void loadData();
    setTimeout(() => setActionMsg(""), 4000);
    return res;
  };

  const summary = feedingData?.summary;
  const feeders: FeederItem[] = Array.isArray(feedingData?.feeders)
    ? feedingData.feeders
    : [];

  const haltedFeeders = feeders.filter(
    (f) => f.is_blocked || f.status === "STOPPED" || f.status === "ERROR"
  );
  const reducedFeeders = feeders.filter(
    (f) =>
      !f.is_blocked &&
      f.status !== "STOPPED" &&
      f.status !== "ERROR" &&
      (f.reduction_percentage ?? 0) > 0
  );
  const optimalFeeders = feeders.filter(
    (f) =>
      !f.is_blocked &&
      f.status !== "STOPPED" &&
      f.status !== "ERROR" &&
      (f.reduction_percentage ?? 0) === 0
  );

  const readyFeedersCount = feeders.length - haltedFeeders.length;
  const formatPondLabel = (f: FeederItem) =>
    `Pond ${String(f.pond_number ?? f.pond_id).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E3EAE5]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172820] tracking-tight">
            Smart Feeding Engine &amp; Feeder Actuators
          </h1>
          <p className="text-xs text-[#68776F] font-medium mt-1">
            Biomass-Driven Nutrition Modeling • Dissolved Oxygen &amp; Temperature Safety Interlocks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1 font-bold ${
              feeders.length === 0
                ? "badge-neutral"
                : haltedFeeders.length > 0
                ? "badge-soft-warning"
                : "badge-soft-success"
            }`}
          >
            {feeders.length > 0
              ? `${readyFeedersCount}/${feeders.length} Feeders Ready`
              : loading
              ? "Loading Feeders..."
              : "0 Feeders Active"}
          </span>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="p-2 rounded-lg border border-[#E3EAE5] bg-white hover:bg-[#EFF4F0] text-[#172820] transition disabled:opacity-50"
            title="Refresh feeding fleet"
            aria-label="Refresh feeding fleet"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F7C8C8] text-[#C84040] text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#F7C8C8] text-[#172820] font-bold hover:bg-[#FDF2F2]"
          >
            Retry
          </button>
        </div>
      )}

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-[#EAF6EE] border border-[#C6E7D2] text-[#21845A] text-xs font-bold flex items-center space-x-2 shadow-[0_2px_8px_rgba(33,132,90,0.08)]">
          <CheckCircle className="h-4 w-4 text-[#21845A] shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* 1. Feed KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Today's Feed
          </span>
          <p className="text-2xl font-black text-[#172820] mt-1 tabular-nums">
            {summary?.today_feed_kg ?? "--"}{" "}
            <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[10px] text-[#68776F]">
            {feeders.length} Active Pond Feeders
          </span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Recommended
          </span>
          <p className="text-2xl font-black text-[#168B91] mt-1 tabular-nums">
            {summary?.recommended_feed_kg ?? "--"}{" "}
            <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[10px] text-[#68776F]">Biomass Algorithm</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Feed Consumed
          </span>
          <p className="text-2xl font-black text-[#21845A] mt-1 tabular-nums">
            {summary?.feed_consumed_kg ?? "--"}{" "}
            <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[10px] text-[#21845A] font-semibold">Estimated ingestion</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Feed Remaining
          </span>
          <p className="text-2xl font-black text-[#172820] mt-1 tabular-nums">
            {summary?.feed_remaining_kg ?? "--"}{" "}
            <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[10px] text-[#68776F]">Daily quota headroom</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Target FCR
          </span>
          <p className="text-2xl font-black text-[#172820] mt-1 tabular-nums">
            {summary?.fcr ?? "--"}
          </p>
          <span className="text-[10px] text-[#21845A] font-semibold">Saved vs 1.65 norm</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Feed Efficiency
          </span>
          <p className="text-2xl font-black text-[#168B91] mt-1 tabular-nums">
            {summary?.feeding_efficiency_pct ?? "--"}%
          </p>
          <span className="text-[10px] text-[#68776F]">Minimal benthic sludge</span>
        </div>
      </div>

      {/* 2. Smart Feeding Safety Explanation Card */}
      <div className="soft-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="h-4.5 w-4.5 text-[#B7791F]" />
            <h2 className="text-sm font-extrabold text-[#172820]">
              Explainable Environmental Feeding Interlocks
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#68776F]">
            Live Per-Feeder Interlock Status
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-[#F7C8C8] bg-[#FDF2F2]/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#C84040]">
              <span>
                {haltedFeeders.length > 0
                  ? `${haltedFeeders.map(formatPondLabel).join(", ")}: Interlock Hold`
                  : "No Feeders Locked Out"}
              </span>
              <span className="badge-soft-critical text-[10px] px-2 py-0.5">
                {haltedFeeders.length} HALTED
              </span>
            </div>
            {haltedFeeders.length > 0 ? (
              <div className="space-y-1.5 text-xs text-[#172820] leading-relaxed">
                {haltedFeeders.slice(0, 3).map((hf) => (
                  <p key={hf.id}>
                    <strong>{formatPondLabel(hf)} ({hf.feeder_code}):</strong>{" "}
                    {hf.block_reason || "Stopped by edge safety interlock."}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#68776F]">
                All monitored ponds clear DO &ge; 4.0 mg/L, TAN &le; 0.10 mg/L, and daily quota limits.
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl border border-[#F6DFB3] bg-[#FEF7EC]/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#B7791F]">
              <span>
                {reducedFeeders.length > 0
                  ? `${reducedFeeders.map(formatPondLabel).join(", ")}: Ration Scaled`
                  : "No Thermal/DO Reduction"}
              </span>
              <span className="badge-soft-warning text-[10px] px-2 py-0.5">
                {reducedFeeders.length} CUT
              </span>
            </div>
            {reducedFeeders.length > 0 ? (
              <div className="space-y-1.5 text-xs text-[#172820] leading-relaxed">
                {reducedFeeders.slice(0, 3).map((rf) => (
                  <p key={rf.id}>
                    <strong>
                      {formatPondLabel(rf)} (-{rf.reduction_percentage}%):
                    </strong>{" "}
                    {rf.reduction_reason || "Scaled back due to ambient water conditions."}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#68776F]">
                No unblocked feeders currently require thermal or moderate-DO ration curtailment.
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl border border-[#C6E7D2] bg-[#EAF6EE]/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#21845A]">
              <span>
                {optimalFeeders.length > 0
                  ? `${optimalFeeders.length} Feeders at 100% Ration`
                  : "0 Feeders at Full Ration"}
              </span>
              <span className="badge-soft-success text-[10px] px-2 py-0.5">
                {optimalFeeders.length} OPTIMAL
              </span>
            </div>
            <p className="text-xs text-[#172820] leading-relaxed">
              {optimalFeeders.length > 0
                ? `${optimalFeeders.map(formatPondLabel).join(", ")} clear all biological safety thresholds and are operating on normal SMART_AUTO ration schedules.`
                : "No feeders currently running full uncurtailed schedule."}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Feeder Actuator Fleet Grid */}
      <div className="soft-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div>
            <h2 className="text-sm font-extrabold text-[#172820]">
              Automated Feeder Fleet Controls ({feeders.length} {feeders.length === 1 ? "Unit" : "Units"})
            </h2>
            <p className="text-xs text-[#68776F]">
              Unique per-pond feeder controllers, hopper telemetry, daily quotas, and schedules
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {feeders.map((f) => {
            const isStopped = f.is_blocked || f.status === "STOPPED" || f.status === "ERROR";
            return (
              <div
                key={f.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isStopped
                    ? "border-[#F7C8C8] bg-[#FDF2F2]/20"
                    : "border-[#E3EAE5] bg-white hover:border-[#C6E7D2]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold text-[#168B91] block truncate">
                        {f.feeder_code} • {formatPondLabel(f)}
                      </span>
                      <span className="text-xs font-bold text-[#172820] block truncate">
                        {f.name}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isStopped
                          ? "badge-soft-critical"
                          : "badge-soft-success"
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-[#68776F] mb-3">
                    <div className="flex justify-between">
                      <span>Hopper:</span>
                      <span className="font-bold text-[#172820] tabular-nums">
                        {f.current_feed_level_kg ?? "--"} kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Today / Quota:</span>
                      <span className="font-bold text-[#21845A] tabular-nums">
                        {f.dispensed_today_kg ?? "--"} / {f.daily_quota_kg ?? "--"} kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next:</span>
                      <span className="font-medium text-[#172820]">
                        {f.next_feeding_time ?? "--"}
                      </span>
                    </div>
                  </div>

                  {f.block_reason && (
                    <p className="text-[10px] text-[#C84040] font-medium mb-2.5 leading-snug">
                      {f.block_reason}
                    </p>
                  )}
                </div>

                {/* Actuator Action Buttons */}
                <div className="flex items-center space-x-1.5 pt-2 border-t border-[#EEF2EF]">
                  <button
                    type="button"
                    onClick={() => triggerFeederSafetyModal(f, "START", 2.5)}
                    disabled={isStopped}
                    className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-[#247653] text-white hover:bg-[#174D39] disabled:opacity-40 transition-colors text-center shadow-sm"
                  >
                    Dispense
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerFeederSafetyModal(f, "STOP")}
                    className="py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-[#EFF4F0] text-[#172820] hover:bg-[#E3EAE5] transition-colors"
                  >
                    Stop
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="text-center py-2 text-xs text-[#68776F] flex items-center justify-center space-x-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#247653]" />
          <span>Syncing automated feeder fleet...</span>
        </div>
      )}

      {/* Hardened Feeder Command Safety Modal */}
      {safetyModal.feeder && (
        <CommandSafetyModal
          isOpen={safetyModal.isOpen}
          onClose={() =>
            setSafetyModal({ isOpen: false, feeder: null, action: "", amountKg: 2.5 })
          }
          onConfirm={handleExecuteFeederControl}
          title={
            safetyModal.action === "STOP"
              ? "Confirm Feeder Halt"
              : "Confirm Remote Feed Dispense"
          }
          actionDescription={`${safetyModal.action} (${safetyModal.amountKg} kg pellet batch)`}
          equipmentName={`${safetyModal.feeder.name} (${safetyModal.feeder.feeder_code}) - ${formatPondLabel(safetyModal.feeder)}`}
          equipmentType="FEEDER"
          safetyWarnings={[
            "Daily feeding quota is strictly monitored to prevent toxic ammonia/nitrite buildup.",
            "Feeder dispense will be safely held if Pond DO drops below 4.8 mg/L during the feeding cycle.",
          ]}
        />
      )}
    </div>
  );
};
