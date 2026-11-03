import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  UtensilsCrossed,
  ShieldAlert,
  Play,
  Square,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";

import { CommandSafetyModal } from "../components/CommandSafetyModal";

export const Feeding: React.FC = () => {
  const [feedingData, setFeedingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string>("");

  // Safety confirmation modal state
  const [safetyModal, setSafetyModal] = useState<{
    isOpen: boolean;
    feeder: any | null;
    action: string;
    amountKg: number;
  }>({
    isOpen: false,
    feeder: null,
    action: "",
    amountKg: 2.5,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getFeedingStatus();
      setFeedingData(res);
    } catch (e) {
      console.warn("Failed to load feeding status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerFeederSafetyModal = (feeder: any, action: string, amountKg: number = 2.5) => {
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
    loadData();
    setTimeout(() => setActionMsg(""), 4000);
    return res;
  };

  const summary = feedingData?.summary || {
    today_feed_kg: 384.0,
    recommended_feed_kg: 412.0,
    feed_consumed_kg: 368.6,
    feed_remaining_kg: 43.4,
    fcr: 1.24,
    feeding_efficiency_pct: 94.2,
  };

  const feeders = feedingData?.feeders || [];

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

        <span className="badge-soft-success text-xs px-3 py-1 font-bold">
          10 Solar Acoustic Feeders Online
        </span>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-[#EAF6EE] border border-[#C6E7D2] text-[#21845A] text-xs font-bold flex items-center space-x-2 shadow-[0_2px_8px_rgba(33,132,90,0.08)] animate-pulse">
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
            {summary.today_feed_kg} <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[10px] text-[#68776F]">10 Ponds Aggregate</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Recommended
          </span>
          <p className="text-2xl font-black text-[#168B91] mt-1 tabular-nums">
            {summary.recommended_feed_kg} <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[10px] text-[#68776F]">Biomass Algorithm</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Feed Consumed
          </span>
          <p className="text-2xl font-black text-[#21845A] mt-1 tabular-nums">
            {summary.feed_consumed_kg} <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[10px] text-[#21845A] font-semibold">96% ingestion rate</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Feed Remaining
          </span>
          <p className="text-2xl font-black text-[#172820] mt-1 tabular-nums">
            {summary.feed_remaining_kg} <span className="text-xs font-normal text-[#68776F]">kg</span>
          </p>
          <span className="text-[10px] text-[#68776F]">Evening cycle quota</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Current FCR
          </span>
          <p className="text-2xl font-black text-[#172820] mt-1 tabular-nums">
            {summary.fcr}
          </p>
          <span className="text-[10px] text-[#21845A] font-semibold">Saved 0.41 vs 1.65 norm</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[10px] font-bold text-[#68776F] uppercase tracking-wider block">
            Feed Efficiency
          </span>
          <p className="text-2xl font-black text-[#168B91] mt-1 tabular-nums">
            {summary.feeding_efficiency_pct}%
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
            Automatic Safety Adjustments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-[#F7C8C8] bg-[#FDF2F2]/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#C84040]">
              <span>Pond 08: Safety Lockout (100% Stop)</span>
              <span className="badge-soft-critical text-[10px] px-2 py-0.5">HALTED</span>
            </div>
            <p className="text-xs text-[#68776F]">
              Recommended: 48 kg &rarr; Dispensed: 0 kg.
            </p>
            <p className="text-xs text-[#172820] font-medium leading-relaxed">
              <strong>Interlock Trigger:</strong> DO fell to 3.4 mg/L (&lt; 3.8 mg/L cutoff) with elevated ammonia. Dispensing feed during hypoxia causes acute mortality and benthic sulfide generation.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#F6DFB3] bg-[#FEF7EC]/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#B7791F]">
              <span>Pond 04: Ration Reduced by 25%</span>
              <span className="badge-soft-warning text-[10px] px-2 py-0.5">CUT 25%</span>
            </div>
            <p className="text-xs text-[#68776F]">
              Recommended: 42 kg &rarr; Dispensed: 31.5 kg.
            </p>
            <p className="text-xs text-[#172820] font-medium leading-relaxed">
              <strong>Interlock Trigger:</strong> Water temperature peaked at 32.8°C at 14:00. Thermal stress reduces shrimp gastric motility; ration scaled back to eliminate uneaten pellet decay.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#C6E7D2] bg-[#EAF6EE]/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#21845A]">
              <span>Ponds 01–03, 05–07, 09–10: 100% Ration</span>
              <span className="badge-soft-success text-[10px] px-2 py-0.5">OPTIMAL</span>
            </div>
            <p className="text-xs text-[#68776F]">
              Dispensing 100% planned biological ration.
            </p>
            <p className="text-xs text-[#172820] font-medium leading-relaxed">
              <strong>Conditions:</strong> Dissolved oxygen stable (&gt; 5.8 mg/L), water temperature 28–30°C, and clean check-trays confirmed within 90 minutes.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Feeder Actuator Fleet Grid */}
      <div className="soft-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE5]">
          <div>
            <h2 className="text-sm font-extrabold text-[#172820]">
              Automated Feeder Fleet Controls (10 Units)
            </h2>
            <p className="text-xs text-[#68776F]">
              Direct remote dispenser controls, quota configuration, and timer schedules
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {feeders.map((f: any) => {
            const isStopped = f.status === "STOPPED" || f.status === "ERROR";
            return (
              <div
                key={f.id}
                className={`p-4 rounded-xl border transition-all ${
                  isStopped
                    ? "border-[#F7C8C8] bg-[#FDF2F2]/20"
                    : "border-[#E3EAE5] bg-white hover:border-[#C6E7D2]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#172820]">
                    {f.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <span className="font-bold text-[#172820] tabular-nums">{f.current_feed_level_kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Today:</span>
                    <span className="font-bold text-[#21845A] tabular-nums">{f.dispensed_today_kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next:</span>
                    <span className="font-medium text-[#172820]">{f.next_feeding_time}</span>
                  </div>
                </div>

                {/* Actuator Action Buttons */}
                <div className="flex items-center space-x-1.5 pt-2 border-t border-[#EEF2EF]">
                  <button
                    onClick={() => triggerFeederSafetyModal(f, "START", 2.5)}
                    disabled={isStopped}
                    className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-[#247653] text-white hover:bg-[#174D39] disabled:opacity-40 transition-colors text-center shadow-sm"
                  >
                    Dispense
                  </button>
                  <button
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
          onClose={() => setSafetyModal({ isOpen: false, feeder: null, action: "", amountKg: 2.5 })}
          onConfirm={handleExecuteFeederControl}
          title={
            safetyModal.action === "STOP"
              ? "Confirm Feeder Halt"
              : "Confirm Remote Feed Dispense"
          }
          actionDescription={`${safetyModal.action} (${safetyModal.amountKg} kg pellet batch)`}
          equipmentName={`${safetyModal.feeder.name} - Pond 0${safetyModal.feeder.pond_id}`}
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
