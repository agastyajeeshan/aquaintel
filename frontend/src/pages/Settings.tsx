import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  SlidersHorizontal,
  Users,
  CheckCircle,
  Save,
  Loader2,
  Settings as SettingsIcon,
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
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3F3E9] text-[#247653]">
              <SettingsIcon className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#172820] tracking-tight">
              System Settings & Role-Based Access Control (RBAC)
            </h1>
          </div>
          <p className="text-sm text-[#68776F] mt-1">
            Environmental Safety Thresholds • Actuator Hysteresis • User Clearances
          </p>
        </div>

        <button
          onClick={handleSave}
          className="btn-primary text-xs flex items-center space-x-2 py-2 px-4"
        >
          <Save className="h-4 w-4" />
          <span>Save Thresholds</span>
        </button>
      </div>

      {saveMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center space-x-2 shadow-soft">
          <CheckCircle className="h-4 w-4 text-[#21845A] shrink-0" />
          <span>{saveMsg}</span>
        </div>
      )}

      {/* Thresholds Form */}
      <form onSubmit={handleSave} className="soft-card p-6 space-y-6">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-[#E3EAE5]">
          <div className="p-2 rounded-xl bg-[#E3F3E9] text-[#247653]">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#172820]">
              Water Quality Automation & Actuator Hysteresis Thresholds
            </h2>
            <p className="text-xs text-[#68776F]">Directly drives backend edge state-machine transitions and equipment interlocks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-semibold text-[#172820]">
          <div>
            <label className="block mb-1 text-[#68776F]">DO Emergency Threshold (mg/L)</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.do_emergency_threshold || 3.8}
              onChange={(e) => setThresholds({ ...thresholds, do_emergency_threshold: parseFloat(e.target.value) })}
              className="soft-input w-full font-bold tabular-nums"
            />
            <span className="text-[10px] text-[#68776F] font-normal mt-0.5 block">Forces 100% aerators ON (Cascade Stage 4)</span>
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">DO Boost Threshold (mg/L)</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.do_boost_threshold || 4.8}
              onChange={(e) => setThresholds({ ...thresholds, do_boost_threshold: parseFloat(e.target.value) })}
              className="soft-input w-full font-bold tabular-nums"
            />
            <span className="text-[10px] text-[#68776F] font-normal mt-0.5 block">Engages secondary boost paddlewheels (Stage 3)</span>
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">DO Standby Saturation Cutoff (mg/L)</label>
            <input
              type="number"
              step="0.1"
              value={thresholds.do_standby_threshold || 6.8}
              onChange={(e) => setThresholds({ ...thresholds, do_standby_threshold: parseFloat(e.target.value) })}
              className="soft-input w-full font-bold tabular-nums"
            />
            <span className="text-[10px] text-[#68776F] font-normal mt-0.5 block">Puts aerators on standby to conserve electricity</span>
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">Max Safe Temperature (°C)</label>
            <input
              type="number"
              step="0.5"
              value={thresholds.temp_max_threshold || 33.5}
              onChange={(e) => setThresholds({ ...thresholds, temp_max_threshold: parseFloat(e.target.value) })}
              className="soft-input w-full font-bold tabular-nums"
            />
            <span className="text-[10px] text-[#68776F] font-normal mt-0.5 block">Thermal stress trigger — scales feeding by 35%</span>
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">Ammonia (TAN) Warning Limit (mg/L)</label>
            <input
              type="number"
              step="0.01"
              value={thresholds.ammonia_warning_threshold || 0.08}
              onChange={(e) => setThresholds({ ...thresholds, ammonia_warning_threshold: parseFloat(e.target.value) })}
              className="soft-input w-full font-bold tabular-nums"
            />
            <span className="text-[10px] text-[#68776F] font-normal mt-0.5 block">Sub-lethal toxicity notification boundary</span>
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">Aerator Anti-Cycle Hysteresis (Minutes)</label>
            <input
              type="number"
              value={thresholds.hysteresis_minutes || 10}
              onChange={(e) => setThresholds({ ...thresholds, hysteresis_minutes: parseInt(e.target.value) })}
              className="soft-input w-full font-bold text-[#247653] tabular-nums"
            />
            <span className="text-[10px] text-[#68776F] font-normal mt-0.5 block">Minimum continuous runtime protecting motor windings</span>
          </div>
        </div>

        {/* Checkbox Toggles */}
        <div className="pt-4 border-t border-[#E3EAE5] space-y-3">
          <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5] hover:bg-[#EFF4F0] transition-colors">
            <input
              type="checkbox"
              checked={thresholds.auto_emergency_aeration ?? true}
              onChange={(e) => setThresholds({ ...thresholds, auto_emergency_aeration: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded accent-[#247653]"
            />
            <div>
              <span className="text-xs font-bold text-[#172820] block">
                Automatic Emergency Aeration Override
              </span>
              <span className="text-[11px] text-[#68776F] leading-relaxed">
                Immediately forces all paddlewheels and spiral aerators ON when DO crashes below 3.8 mg/L without waiting for manual operator response.
              </span>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5] hover:bg-[#EFF4F0] transition-colors">
            <input
              type="checkbox"
              checked={thresholds.auto_feeding_cutoff ?? true}
              onChange={(e) => setThresholds({ ...thresholds, auto_feeding_cutoff: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded accent-[#247653]"
            />
            <div>
              <span className="text-xs font-bold text-[#172820] block">
                Automatic Feeding Interlock Safety Stop
              </span>
              <span className="text-[11px] text-[#68776F] leading-relaxed">
                Instantly pauses motorized feeding dispensers if pond DO drops below critical 3.2 mg/L limit or temperature exceeds 34°C.
              </span>
            </div>
          </label>
        </div>
      </form>

      {/* User Management & Role Switcher */}
      <div className="soft-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3EAE5] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-[#247653]" />
            <h3 className="text-sm font-bold text-[#172820]">
              Role-Based Access Control (RBAC) & Active User Switching
            </h3>
          </div>
          <span className="text-xs text-[#68776F]">
            Roles: ADMIN • FARM MANAGER • OPERATOR • VIEWER
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F8F6] text-[#68776F] font-semibold uppercase tracking-wider border-b border-[#E3EAE5]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Permissions Scope</th>
                <th className="py-3 px-4 text-right">Demo Role Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE5] text-[#172820]">
              {users.map((u) => {
                const isCurrent = currentUser.username === u.username;
                return (
                  <tr key={u.id} className="hover:bg-[#F6F8F6] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#172820]">
                      {u.full_name} <span className="text-[#68776F] font-normal font-mono">(@{u.username})</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#68776F]">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="badge-soft-info text-[10px] font-mono">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#68776F]">
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
                        <span className="badge-soft-success text-xs font-semibold py-1 px-3">
                          Active Session
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRoleSwitch(u)}
                          className="btn-secondary text-xs py-1 px-3"
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

      {loading && (
        <div className="text-center py-2 text-xs text-[#68776F] flex items-center justify-center space-x-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#247653]" />
          <span>Synchronizing security governance profile...</span>
        </div>
      )}
    </div>
  );
};
