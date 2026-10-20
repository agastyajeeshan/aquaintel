import React from "react";
import { useApp } from "../context/AppContext";
import {
  Layers,
  Building,
  Package,
  Users,
  Anchor,
  Compass,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";

export const FarmManagement: React.FC = () => {
  const { overview } = useApp();

  const inventory = [
    { item: "Grower Pellet 38% Protein (1.8mm)", brand: "CP Aquaculture", stockKg: 14500, daysSupply: 38, status: "IN_STOCK" },
    { item: "Starter Crumbles 40% Protein (0.8mm)", brand: "Avanti Feeds", stockKg: 2200, daysSupply: 60, status: "IN_STOCK" },
    { item: "Bio-Aqua Probiotic Nitrifiers (Bacillus sp.)", brand: "Biostim Aqua", stockKg: 350, daysSupply: 25, status: "LOW_STOCK" },
    { item: "Agricultural Dolomite & Lime (CaMgCO3)", brand: "Deccan Minerals", stockKg: 8000, daysSupply: 45, status: "IN_STOCK" },
  ];

  const employees = [
    { name: "Dr. K. Srinivas", role: "Chief Agritech Director", phone: "+91 98480 11223", shift: "General Admin", clearance: "ADMIN" },
    { name: "V. Naresh", role: "Farm General Manager", phone: "+91 98480 22334", shift: "Day Shift (06:00 - 18:00)", clearance: "FARM_MANAGER" },
    { name: "B. Venkat", role: "Field Shift Supervisor", phone: "+91 98480 33445", shift: "Night Watch (18:00 - 06:00)", clearance: "OPERATOR" },
    { name: "Ramesh Kumar", role: "Lead Electro-Mechanical Tech", phone: "+91 98480 44556", shift: "Preventive Maintenance", clearance: "OPERATOR" },
    { name: "Suresh Aqua", role: "Water Quality Lab Technician", phone: "+91 98480 55667", shift: "Sampling & Calibration", clearance: "OPERATOR" },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Commercial Farm Management & Asset Inventory
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Facility Profile • Stocking Batches • Feed Warehousing • Operating Personnel
          </p>
        </div>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
          ISO 9001 / BAP Certified Standard
        </span>
      </div>

      {/* Farm Profile Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center space-x-2">
          <Building className="h-5 w-5 text-teal-700" />
          <span>AquaIntel Commercial Delta Estate Profile</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">
              Geographic Location
            </span>
            <p className="font-bold text-slate-900 text-sm mt-1">
              {overview?.location || "Nellore Coastal Belt, Andhra Pradesh, India"}
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Coordinates: 14.4426° N, 79.9865° E
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">
              Production Water Source
            </span>
            <p className="font-bold text-slate-900 text-sm mt-1">
              Brackish Estuarine + Marine Borewell
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Salinity Range: 18 - 24 ppt
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">
              Active Culture Species
            </span>
            <p className="font-bold text-slate-900 text-sm mt-1">
              Litopenaeus vannamei (SPF Broodstock)
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Density: 45 Post-Larvae (PL) / m²
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">
              Primary Power Architecture
            </span>
            <p className="font-bold text-slate-900 text-sm mt-1">
              125 kVA Silent DG + 40 kW Solar Grid
            </p>
            <span className="text-[11px] text-teal-700 font-semibold mt-0.5 block">
              Automatic Transfer Switch (ATS)
            </span>
          </div>
        </div>
      </div>

      {/* Feed & Probiotic Inventory */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Warehouse Feed & Biosecurity Probiotics Inventory
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            Dry Storage Warehouse Bay 02
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item & Formulation</th>
                <th className="py-3 px-4">Brand / Supplier</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Estimated Runway</th>
                <th className="py-3 px-4">Inventory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inventory.map((inv, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{inv.item}</td>
                  <td className="py-3 px-4">{inv.brand}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{inv.stockKg.toLocaleString()} kg</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{inv.daysSupply} Days</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.status === "LOW_STOCK"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {inv.status === "LOW_STOCK" ? "REORDER REQUIRED" : "ADEQUATE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff & Shift Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Technical Staff & Field Operating Roster
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            24/7 Monitored Shifts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Shift Schedule</th>
                <th className="py-3 px-4">System Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {employees.map((emp, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{emp.name}</td>
                  <td className="py-3 px-4 font-medium">{emp.role}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{emp.phone}</td>
                  <td className="py-3 px-4">{emp.shift}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                      {emp.clearance}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
