import React, { useState } from "react";
import {
  Wrench,
  CheckCircle,
  Plus,
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
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3F3E9] text-[#247653]">
              <Wrench className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#172820] tracking-tight">
              Equipment Asset Maintenance & Service Logs
            </h1>
          </div>
          <p className="text-sm text-[#68776F] mt-1">
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
          className="btn-primary text-xs flex items-center space-x-2 py-2 px-3.5"
        >
          <Plus className="h-4 w-4" />
          <span>Log Maintenance Task</span>
        </button>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center space-x-2 shadow-soft">
          <CheckCircle className="h-4 w-4 text-[#21845A] shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="soft-card p-4">
          <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
            Scheduled Tasks
          </span>
          <p className="text-2xl font-bold text-[#172820] tabular-nums mt-1">
            {records.filter((r) => r.status === "PENDING").length}
          </p>
          <span className="text-[10px] text-[#68776F]">Upcoming this fortnight</span>
        </div>

        <div className="soft-card p-4 bg-red-50/20 border-red-200/50">
          <span className="text-[11px] font-bold text-[#C84040] uppercase tracking-wider block">
            High Priority
          </span>
          <p className="text-2xl font-bold text-[#C84040] tabular-nums mt-1">
            {records.filter((r) => r.priority === "HIGH" && r.status === "PENDING").length}
          </p>
          <span className="text-[10px] text-[#C84040] font-semibold">Sensor Calibration Due</span>
        </div>

        <div className="soft-card p-4 bg-[#E3F3E9]/30 border-[#247653]/30">
          <span className="text-[11px] font-bold text-[#247653] uppercase tracking-wider block">
            Completed (Month)
          </span>
          <p className="text-2xl font-bold text-[#21845A] tabular-nums mt-1">
            {records.filter((r) => r.status === "COMPLETED").length}
          </p>
          <span className="text-[10px] text-[#21845A] font-semibold">100% On-Time Resolution</span>
        </div>

        <div className="soft-card p-4">
          <span className="text-[11px] font-bold text-[#68776F] uppercase tracking-wider block">
            Maint. Expenditure
          </span>
          <p className="text-2xl font-bold text-[#172820] tabular-nums mt-1">
            ₹{records.reduce((acc, r) => acc + r.cost_inr, 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-[#21845A] font-semibold">Under Monthly Budget</span>
        </div>
      </div>

      {/* Maintenance Tasks Table */}
      <div className="soft-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3EAE5] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#172820]">
            Work Orders & Calibration Schedule
          </h2>
          <span className="text-xs text-[#68776F]">
            Next Critical: Optical DO Membrane (Pond 08)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F8F6] text-[#68776F] font-semibold uppercase tracking-wider border-b border-[#E3EAE5]">
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
            <tbody className="divide-y divide-[#E3EAE5] text-[#172820]">
              {records.map((r) => {
                const isPending = r.status === "PENDING";
                const isHigh = r.priority === "HIGH";

                return (
                  <tr key={r.id} className="hover:bg-[#F6F8F6] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#172820] block">{r.equipment_type}</span>
                      <span className="text-[10px] font-mono text-[#68776F]">{r.equipment_code} {r.pond_id ? `(Pond 0${r.pond_id})` : ""}</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="font-semibold text-[#172820] block">{r.title}</span>
                      <span className="text-[11px] text-[#68776F]">{r.notes}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold ${
                          isHigh
                            ? "badge-soft-danger"
                            : r.priority === "MEDIUM"
                            ? "badge-soft-warning"
                            : "badge-soft-info"
                        }`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-[#68776F]">{r.scheduled_date}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#172820]">{r.technician}</td>
                    <td className="py-3.5 px-4 font-mono font-bold tabular-nums">₹{r.cost_inr}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold ${
                          r.status === "COMPLETED"
                            ? "badge-soft-success"
                            : "badge-soft-warning"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isPending ? (
                        <button
                          onClick={() => handleMarkComplete(r.id)}
                          className="btn-primary text-[11px] py-1 px-2.5"
                        >
                          Complete
                        </button>
                      ) : (
                        <span className="text-[#21845A] font-semibold text-[11px] flex items-center justify-end space-x-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Signed Off</span>
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
