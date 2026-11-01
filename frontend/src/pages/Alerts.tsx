import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Bell,
  CheckCircle,
  BellRing,
  Smartphone,
  Mail,
  MessageSquare,
  Loader2,
} from "lucide-react";

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionMsg, setActionMsg] = useState<string>("");

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts(
        statusFilter === "ALL" ? undefined : statusFilter,
        severityFilter === "ALL" ? undefined : severityFilter
      );
      setAlerts(res);
    } catch (e) {
      console.warn("Failed to load alerts", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [severityFilter, statusFilter]);

  const handleAcknowledge = async (id: number) => {
    try {
      await api.acknowledgeAlert(id);
      setActionMsg(`Alert #${id} acknowledged.`);
      loadAlerts();
      setTimeout(() => setActionMsg(""), 3000);
    } catch (e: any) {
      setActionMsg("Error: " + e.message);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await api.resolveAlert(id);
      setActionMsg(`Alert #${id} marked as resolved.`);
      loadAlerts();
      setTimeout(() => setActionMsg(""), 3000);
    } catch (e: any) {
      setActionMsg("Error: " + e.message);
    }
  };

  const handleIgnore = async (id: number) => {
    try {
      await api.ignoreAlert(id);
      setActionMsg(`Alert #${id} dismissed.`);
      loadAlerts();
      setTimeout(() => setActionMsg(""), 3000);
    } catch (e: any) {
      setActionMsg("Error: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3F3E9] text-[#247653]">
              <Bell className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#172820] tracking-tight">
              Alarm Management & Escalation Center
            </h1>
          </div>
          <p className="text-sm text-[#68776F] mt-1">
            Multi-Tier Water Quality, Biological, and Hardware Telemetry Alarms
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="soft-input py-1.5 px-3 text-xs"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="soft-input py-1.5 px-3 text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center space-x-2 shadow-soft">
          <CheckCircle className="h-4 w-4 text-[#21845A] shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Notification Channels Status */}
      <div className="soft-card p-5 space-y-3">
        <h2 className="text-xs font-bold text-[#68776F] uppercase tracking-wider">
          Configured Alert Dispatch Channels
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <BellRing className="h-4 w-4 text-[#247653]" />
              <span className="font-semibold text-[#172820]">In-App Push</span>
            </div>
            <span className="badge-soft-success text-[10px] py-0.5">
              ACTIVE
            </span>
          </div>

          <div className="p-3 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Mail className="h-4 w-4 text-[#168B91]" />
              <span className="font-semibold text-[#172820]">Email Digest</span>
            </div>
            <span className="badge-soft-success text-[10px] py-0.5">
              ACTIVE
            </span>
          </div>

          <div className="p-3 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Smartphone className="h-4 w-4 text-[#3478B8]" />
              <span className="font-semibold text-[#172820]">SMS Gateway</span>
            </div>
            <span className="badge-soft-info text-[10px] py-0.5">
              READY
            </span>
          </div>

          <div className="p-3 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <MessageSquare className="h-4 w-4 text-purple-700" />
              <span className="font-semibold text-[#172820]">WhatsApp API</span>
            </div>
            <span className="badge-soft-info text-[10px] py-0.5">
              CONNECTED
            </span>
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#68776F] flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#247653]" />
            <span>Loading alerts registry...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="soft-card p-12 text-center text-xs text-[#68776F]">
            No alerts found matching filter criteria. All pond telemetry within nominal parameters.
          </div>
        ) : (
          alerts.map((a) => {
            const isCrit = a.severity === "CRITICAL";
            const isHigh = a.severity === "HIGH";
            const isWarn = a.severity === "WARNING";
            const isActive = a.status === "ACTIVE";

            return (
              <div
                key={a.id}
                className={`soft-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isCrit && isActive
                    ? "border-[#C84040]/40 ring-2 ring-red-100"
                    : isHigh && isActive
                    ? "border-amber-300 ring-1 ring-amber-100"
                    : "border-[#E3EAE5]"
                }`}
              >
                {/* Left: Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        isCrit
                          ? "badge-soft-danger"
                          : isHigh
                          ? "badge-soft-warning"
                          : isWarn
                          ? "badge-soft-warning"
                          : "badge-soft-info"
                      }`}
                    >
                      {a.severity}
                    </span>

                    <span className="text-xs font-bold text-[#172820]">
                      {a.pond_id ? `Pond 0${a.pond_id}` : "Infrastructure"}
                    </span>

                    <span className="text-xs text-[#68776F] tabular-nums">
                      • {a.created_at}
                    </span>

                    <span
                      className={`text-[10px] font-semibold ${
                        isActive
                          ? "badge-soft-danger"
                          : a.status === "ACKNOWLEDGED"
                          ? "badge-soft-warning"
                          : "badge-soft-success"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#172820]">
                    {a.title}
                  </h3>

                  <p className="text-xs text-[#68776F] leading-relaxed">
                    {a.description}
                  </p>

                  {a.cause && (
                    <div className="text-xs text-[#172820]">
                      <strong className="text-[#68776F]">Root Cause:</strong> {a.cause}
                    </div>
                  )}

                  {a.recommended_action && (
                    <div className="p-3 rounded-xl bg-[#EFF4F0] border border-[#E3EAE5] text-xs text-[#172820]">
                      <strong className="text-[#247653]">Recommended Action:</strong> {a.recommended_action}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex md:flex-col items-end justify-center gap-2 shrink-0">
                  {isActive && (
                    <button
                      onClick={() => handleAcknowledge(a.id)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Acknowledge
                    </button>
                  )}

                  {a.status !== "RESOLVED" && (
                    <button
                      onClick={() => handleResolve(a.id)}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      Mark Resolved
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={() => handleIgnore(a.id)}
                      className="text-xs text-[#68776F] hover:text-[#172820] py-1"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
