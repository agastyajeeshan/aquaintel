import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Bell,
  Users,
  Sliders,
  CheckCircle,
  Save,
  Lock,
} from "lucide-react";

export const Settings: React.FC = () => {
  const { currentUser, setCurrentUser } = useApp();
  const [thresholds, setThresholds] = useState<any>({
    do_emergency_threshold: 3.8,
    do_boost_threshold: 4.8,
    do_standby_threshold: 6.8,
    temp_max_threshold: 33.5,
    temp_min_threshold: 26.0,
    ammonia_warning_threshold: 0.08,
    ph_min_threshold: 7.5,
    ph_max_threshold: 8.5,
    hysteresis_minutes: 10,
    auto_emergency_aeration: true,
    auto_feeding_cutoff: true,
  });

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveMsg, setSaveMsg] = useState<string>("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const [sett, userList] = await Promise.all([
          api.getSettings(),
          api.getUsers(),
        ]);
        if (sett) setThresholds(sett);
        if (userList) setUsers(userList);
      } catch (e) {
        console.warn("Failed to load settings", e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings(thresholds);
      setSaveMsg("Farm thresholds & configuration saved successfully.");
      setTimeout(() => setSaveMsg(""), 3500);
    } catch (e: any) {
      setSaveMsg("Failed to save settings: " + e.message);
    }
  };

  const handleRoleSwitch = (u: any) => {
    setCurrentUser(u);
    setSaveMsg(`Switched active demo user to ${u.full_name} (${u.role})`);
    setTimeout(() => setSaveMsg(""), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            System Settings & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Environmental Safety Thresholds • Actuator Hysteresis • User Clearances
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-sm transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>Save Thresholds</span>
        </button>
      </div>

      {saveMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 shadow-subtle animate-pulse">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveMsg}</span>
        </div>
      )}

      {/* Thresholds Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-6">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <Sliders className="h-5 w-5 text-teal-700" />
          <h2 className="text-base font-black text-slate-900">
            Water Quality Automation & Hysteresis Thresholds
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-bold text-slate-700">
          <div>
            <label className="block mb-1">DO Emergency Threshold (mg/L)</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.do_emergency_threshold || 3.8}
              onChange={(e) => setThresholds({ ...thresholds, do_emergency_threshold: parseFloat(e.target.value) })}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
            <span className="text-[10px] text-slate-400 font-normal">Triggers 100% emergency aeration cascade</span>
          </div>

          <div>
            <label className="block mb-1">DO Boost Threshold (mg/L)</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.do_boost_threshold || 4.8}
              onChange={(e) => setThresholds({ ...thresholds, do_boost_threshold: parseFloat(e.target.value) })}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
            <span className="text-[10px] text-slate-400 font-normal">Engages secondary paddlewheels</span>
          </div>

          <div>
            <label className="block mb-1">DO Standby Saturation Cutoff (mg/L)</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.do_standby_threshold || 6.8}
              onChange={(e) => setThresholds({ ...thresholds, do_standby_threshold: parseFloat(e.target.value) })}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
            <span className="text-[10px] text-slate-400 font-normal">Puts aerators on standby to conserve electricity</span>
          </div>

          <div>
            <label className="block mb-1">Max Safe Temperature (°C)</label>
            <input
              type="number"
              step="0.5"
              value={thresholds.temp_max_threshold || 33.5}
              onChange={(e) => setThresholds({ ...thresholds, temp_max_threshold: parseFloat(e.target.value) })}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
            <span className="text-[10px] text-slate-400 font-normal">Scales down feeding by 35%</span>
          </div>

          <div>
            <label className="block mb-1">Ammonia (TAN) Warning Limit (mg/L)</label>
            <input
              type="number"
              step="0.01"
              value={thresholds.ammonia_warning_threshold || 0.08}
              onChange={(e) => setThresholds({ ...thresholds, ammonia_warning_threshold: parseFloat(e.target.value) })}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
            <span className="text-[10px] text-slate-400 font-normal">Warning alert threshold</span>
          </div>

          <div>
            <label className="block mb-1">Aerator Anti-Cycle Hysteresis (Minutes)</label>
            <input
              type="number"
              value={thresholds.hysteresis_minutes || 10}
              onChange={(e) => setThresholds({ ...thresholds, hysteresis_minutes: parseInt(e.target.value) })}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold text-teal-700"
            />
            <span className="text-[10px] text-slate-400 font-normal">Minimum continuous ON/OFF runtime for motors</span>
          </div>
        </div>

        {/* Checkbox Toggles */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={thresholds.auto_emergency_aeration ?? true}
              onChange={(e) => setThresholds({ ...thresholds, auto_emergency_aeration: e.target.checked })}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Automatic Emergency Aeration Override
              </span>
              <span className="text-[11px] text-slate-500">
                Immediately forces all paddlewheels and spiral aerators ON when DO crashes below 3.8 mg/L without waiting for manual operator response.
              </span>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={thresholds.auto_feeding_cutoff ?? true}
              onChange={(e) => setThresholds({ ...thresholds, auto_feeding_cutoff: e.target.checked })}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Automatic Feeding Interlock Safety Stop
              </span>
              <span className="text-[11px] text-slate-500">
                Instantly pauses motorized feeding dispensers if pond DO drops below critical 3.2 mg/L limit or temperature exceeds 34°C.
              </span>
            </div>
          </label>
        </div>
      </form>

      {/* User Management & Role Switcher (Requirement 27) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Role-Based Access Control (RBAC) & Active User Switching
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Roles: ADMIN • FARM MANAGER • OPERATOR • VIEWER
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Permissions Scope</th>
                <th className="py-3 px-4 text-right">Demo Role Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => {
                const isCurrent = currentUser.username === u.username;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {u.full_name} <span className="text-slate-400 font-normal font-mono">(@{u.username})</span>
                    </td>
                    <td className="py-3.5 px-4">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {u.role === "ADMIN"
                        ? "Full root system & farm governance"
                        : u.role === "FARM_MANAGER"
                        ? "Operational overrides, feed quotas, reports"
                        : u.role === "OPERATOR"
                        ? "Field actuations, alerts acknowledgment"
                        : "Read-only analytics and dashboards"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isCurrent ? (
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                          Active User
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRoleSwitch(u)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          Switch to {u.role.replace("_", " ")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
