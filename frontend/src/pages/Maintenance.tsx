import React, { useState } from "react";
import {
  Wrench,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Calendar,
  Toolbox,
  DollarSign,
} from "lucide-react";

export const Maintenance: React.FC = () => {
  const [records, setRecords] = useState([
    {
      id: 1,
      equipment_type: "Sensor Probe",
      equipment_code: "SENS-P08-DO",
      pond_id: 8,
      title: "Optical DO Cap Membrane Calibration & Cleaning",
      priority: "HIGH",
      scheduled_date: "2026-10-08",
      status: "PENDING",
      technician: "Suresh Aqua (Instrumentation)",
      notes: "Zero-point check in sodium sulfite solution + 100% air calibration.",
      cost_inr: 850,
    },
    {
      id: 2,
      equipment_type: "Aerator",
      equipment_code: "AER-P04-1",
      pond_id: 4,
      title: "Gearbox Oil Change & Bushing Greasing",
      priority: "MEDIUM",
      scheduled_date: "2026-10-09",
      status: "PENDING",
      technician: "Ramesh Kumar (Chief Tech)",
      notes: "Quarterly preventive maintenance for 2HP helical gearbox.",
      cost_inr: 1200,
    },
    {
      id: 3,
      equipment_type: "Silent Generator",
      equipment_code: "GEN-125KVA-01",
      pond_id: null,
      title: "Silent DG Set Diesel Filter & Battery Health Test",
      priority: "LOW",
      scheduled_date: "2026-10-14",
      status: "PENDING",
      technician: "Kirloskar Service Engineer",
      notes: "Routine 250-hour engine health check and radiator coolant flush.",
      cost_inr: 4500,
    },
    {
      id: 4,
      equipment_type: "Automated Feeder",
      equipment_code: "FEEDER-P02",
      pond_id: 2,
      title: "Dispenser Auger Cleaning & Solar Battery Testing",
      priority: "LOW",
      scheduled_date: "2026-10-04",
      status: "COMPLETED",
      technician: "Ramesh Kumar (Chief Tech)",
      notes: "Cleaned salt spray buildup from hopper gate.",
      cost_inr: 600,
    },
  ]);

  const [msg, setMsg] = useState<string>("");

  const handleMarkComplete = (id: number) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "COMPLETED" } : r))
    );
    setMsg(`Maintenance record #${id} updated to COMPLETED.`);
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Equipment Asset Maintenance & Service Logs
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Aerator Gearboxes • Optical Sensor Calibrations • Backup Power Systems
          </p>
        </div>

        <button
          onClick={() => {
            setRecords((prev) => [
              {
                id: prev.length + 1,
                equipment_type: "Aerator",
                equipment_code: `AER-P01-${prev.length}`,
                pond_id: 1,
                title: "Impeller Blade Inspection & Tightening",
                priority: "MEDIUM",
                scheduled_date: "2026-10-12",
                status: "PENDING",
                technician: "Ramesh Kumar (Chief Tech)",
                notes: "Scheduled check of nylon blades.",
                cost_inr: 500,
              },
              ...prev,
            ]);
            setMsg("New preventive maintenance service logged.");
            setTimeout(() => setMsg(""), 3000);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Log Maintenance Task</span>
        </button>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 shadow-subtle animate-pulse">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Scheduled Tasks
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {records.filter((r) => r.status === "PENDING").length}
          </p>
          <span className="text-[10px] text-slate-500">Upcoming this fortnight</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-subtle">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
            High Priority
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {records.filter((r) => r.priority === "HIGH" && r.status === "PENDING").length}
          </p>
          <span className="text-[10px] text-rose-600 font-semibold">Sensor Calibration Due</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-subtle">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Completed (Month)
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {records.filter((r) => r.status === "COMPLETED").length}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">100% On-Time Resolution</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Maint. Expenditure
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            ₹{records.reduce((acc, r) => acc + r.cost_inr, 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500">Under Monthly Budget</span>
        </div>
      </div>

      {/* Maintenance Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Work Orders & Calibration Schedule
          </h2>
          <span className="text-xs text-slate-500">
            Next Critical: Optical DO Membrane (Pond 08)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Equipment & Code</th>
                <th className="py-3 px-4">Task Description</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Assigned Tech</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {records.map((r) => {
                const isPending = r.status === "PENDING";
                const isHigh = r.priority === "HIGH";

                return (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{r.equipment_type}</span>
                      <span className="text-[10px] font-mono text-slate-400">{r.equipment_code} {r.pond_id ? `(Pond 0${r.pond_id})` : ""}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium max-w-xs">
                      <span className="font-bold text-slate-800 block">{r.title}</span>
                      <span className="text-[11px] text-slate-500">{r.notes}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isHigh
                            ? "bg-rose-100 text-rose-800"
                            : r.priority === "MEDIUM"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{r.scheduled_date}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{r.technician}</td>
                    <td className="py-3.5 px-4 font-mono font-bold">₹{r.cost_inr}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isPending ? (
                        <button
                          onClick={() => handleMarkComplete(r.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
                        >
                          Complete
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[11px]">
                          ✓ Signed Off
                        </span>
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
