import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Radio,
  Wifi,
  Battery,
  BatteryCharging,
  Cpu,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  RadioTower,
  Server,
  ArrowRight,
} from "lucide-react";

export const IoTDevices: React.FC = () => {
  const [deviceData, setDeviceData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newDevId, setNewDevId] = useState<string>("");
  const [newDevType, setNewDevType] = useState<string>("ESP32_Pond_Master");
  const [newPondId, setNewPondId] = useState<number>(1);
  const [msg, setMsg] = useState<string>("");

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await api.getDevices();
      setDeviceData(res);
    } catch (e) {
      console.warn("Failed to load devices", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevId) return;
    try {
      await api.getDevices(); // fetch
      await (await fetch(`http://localhost:8000/api/devices?device_id=${newDevId}&device_type=${newDevType}&pond_id=${newPondId}`, { method: "POST" })).json();
      setMsg(`Device ${newDevId} registered successfully on LoRa network.`);
      setShowAddModal(false);
      setNewDevId("");
      loadDevices();
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg("Error adding device: " + err.message);
    }
  };

  const summary = deviceData?.summary || {
    total_devices: 30,
    online_devices: 28,
    offline_devices: 2,
    gateway_status: "ONLINE",
    lora_channel: "865.2 MHz (IN865 Band)",
    average_rssi_dbm: -64,
  };

  const devices = deviceData?.devices || [];

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            IoT Edge Devices & LoRaWAN Infrastructure
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            30 Edge Nodes • 865 MHz IN865 ISM Sub-GHz Band • IP67 Industrial Enclosures
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Provision New Node</span>
        </button>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 shadow-subtle animate-pulse">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Connectivity Pipeline Diagram (Requirement 21) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Telemetry Transmission Architecture (Sensors &rarr; Gateway &rarr; Cloud)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-700 block">1. Optical Probes</span>
            <span className="text-[11px] text-slate-500">RS485 Modbus RTU</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Submersible
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
            <span className="font-bold text-teal-900 block">2. ESP32 Node</span>
            <span className="text-[11px] text-teal-700">Solar + LiFePO4</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded bg-teal-200 text-teal-900 text-[10px] font-bold">
              Edge Filter
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-700 block">3. LoRa Radio</span>
            <span className="text-[11px] text-slate-500">865.2 MHz (IN865)</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              2.5 km Range
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
            <span className="font-bold text-teal-900 block">4. Central Gateway</span>
            <span className="text-[11px] text-teal-700">SX1302 Concentrator</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded bg-teal-200 text-teal-900 text-[10px] font-bold">
              ONLINE
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="font-bold text-emerald-900 block">5. AquaIntel Cloud</span>
            <span className="text-[11px] text-emerald-700">FastAPI + Postgres</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">
              Live WebSockets
            </span>
          </div>
        </div>
      </div>

      {/* Network Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Provisioned Nodes
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary.total_devices}
          </p>
          <span className="text-[10px] text-slate-500">ESP32 & RTU Controllers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-subtle">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Online Status
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {summary.online_devices} / {summary.total_devices}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">93.3% Health Index</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            LoRa Gateway
          </span>
          <p className="text-2xl font-black text-teal-700 mt-1">
            {summary.gateway_status}
          </p>
          <span className="text-[10px] text-slate-500">{summary.lora_channel}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Average RSSI
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary.average_rssi_dbm} <span className="text-xs font-normal text-slate-500">dBm</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">Signal Quality: EXCELLENT</span>
        </div>
      </div>

      {/* Devices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Provisioned Hardware Nodes Table
          </h2>
          <span className="text-xs text-slate-500">
            Heartbeat Interval: 5 seconds
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Pond</th>
                <th className="py-3 px-4">Device Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Battery</th>
                <th className="py-3 px-4">Signal (RSSI)</th>
                <th className="py-3 px-4">Firmware</th>
                <th className="py-3 px-4">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {devices.map((d: any) => {
                const isOnline = d.status === "ONLINE";
                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                      {d.device_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {d.pond_id ? `Pond 0${d.pond_id}` : "Farm Central"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {d.device_type.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOnline
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {d.battery_pct}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-slate-800 font-bold">{d.signal_rssi_dbm} dBm</span>{" "}
                      <span className="text-[10px] text-emerald-700 font-semibold">({d.signal_quality})</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {d.firmware_version}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {d.last_seen_seconds_ago}s ago
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Provision New IoT Node
            </h3>

            <form onSubmit={handleAddDevice} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Device Hardware ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. ESP32-P11-TEST"
                  value={newDevId}
                  onChange={(e) => setNewDevId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Device Role / Type
                </label>
                <select
                  value={newDevType}
                  onChange={(e) => setNewDevType(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                >
                  <option value="ESP32_Pond_Master">ESP32 Pond Master</option>
                  <option value="Multi_Probe_Node">Multi-Probe Optical Node</option>
                  <option value="Smart_Feeder_RTU">Smart Feeder RTU Controller</option>
                  <option value="Aerator_VFD_Panel">Aerator VFD Actuator Panel</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assigned Pond
                </label>
                <select
                  value={newPondId}
                  onChange={(e) => setNewPondId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>Pond 0{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-700 text-white font-bold hover:bg-teal-800 shadow-sm"
                >
                  Save & Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
