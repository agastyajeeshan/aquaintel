import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle,
  EyeOff,
  BellRing,
  Filter,
  MessageSquare,
  Smartphone,
  Mail,
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
      setActionMsg(`Alert #${id} ignored.`);
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Alarm Management & Escalation Center
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Multi-Tier Water Quality, Mechanical, and Pathogen Early Warnings
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-subtle"
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
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-subtle"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 shadow-subtle animate-pulse">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Notification Channels Status (Requirement 19) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Configured Alert Dispatch Channels
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BellRing className="h-4 w-4 text-emerald-700" />
              <span className="font-bold text-emerald-900">In-App Live Push</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200 px-1.5 py-0.5 rounded">
              ACTIVE
            </span>
          </div>

          <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-teal-700" />
              <span className="font-bold text-teal-900">Email Digest</span>
            </div>
            <span className="text-[10px] font-bold text-teal-800 bg-teal-200 px-1.5 py-0.5 rounded">
              ACTIVE
            </span>
          </div>

          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4 text-blue-700" />
              <span className="font-bold text-blue-900">SMS Gateway</span>
            </div>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-200 px-1.5 py-0.5 rounded">
              READY
            </span>
          </div>

          <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-purple-700" />
              <span className="font-bold text-purple-900">WhatsApp API</span>
            </div>
            <span className="text-[10px] font-bold text-purple-800 bg-purple-200 px-1.5 py-0.5 rounded">
              INTEGRATED
            </span>
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading alerts registry...
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
            No alerts found matching filter criteria.
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
                className={`bg-white rounded-2xl border p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isCrit && isActive
                    ? "border-rose-300 ring-2 ring-rose-100"
                    : isHigh && isActive
                    ? "border-amber-300 ring-1 ring-amber-100"
                    : "border-slate-200"
                }`}
              >
                {/* Left: Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                        isCrit
                          ? "bg-rose-100 text-rose-800"
                          : isHigh
                          ? "bg-amber-100 text-amber-800"
                          : isWarn
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.severity}
                    </span>

                    <span className="text-xs font-bold text-slate-900">
                      {a.pond_id ? `Pond 0${a.pond_id}` : "Infrastructure"}
                    </span>

                    <span className="text-xs text-slate-400 font-mono">
                      • {a.created_at}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isActive
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : a.status === "ACKNOWLEDGED"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {a.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {a.description}
                  </p>

                  {a.cause && (
                    <div className="text-xs text-slate-700">
                      <strong>Root Cause:</strong> {a.cause}
                    </div>
                  )}

                  {a.recommended_action && (
                    <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-200 text-xs text-teal-900">
                      <strong>Recommended Operator Action:</strong> {a.recommended_action}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex md:flex-col items-end justify-center space-y-2 shrink-0">
                  {isActive && (
                    <button
                      onClick={() => handleAcknowledge(a.id)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}

                  {a.status !== "RESOLVED" && (
                    <button
                      onClick={() => handleResolve(a.id)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Mark Resolved
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={() => handleIgnore(a.id)}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600"
                    >
                      Ignore Alert
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
