import React from "react";
import { useApp } from "../context/AppContext";
import {
  Building,
  Package,
  Users,
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
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3F3E9] text-[#247653]">
              <Building className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#172820] tracking-tight">
              Commercial Farm Management & Asset Inventory
            </h1>
          </div>
          <p className="text-sm text-[#68776F] mt-1">
            Facility Profile • Stocking Batches • Feed Warehousing • Operating Personnel
          </p>
        </div>

        <span className="badge-soft-success text-xs font-semibold py-1 px-3">
          ISO 9001 / BAP Certified Facility
        </span>
      </div>

      {/* Farm Profile Summary */}
      <div className="soft-card p-6 space-y-4">
        <h2 className="text-base font-bold text-[#172820] pb-3 border-b border-[#E3EAE5] flex items-center space-x-2">
          <Building className="h-4 w-4 text-[#247653]" />
          <span>AquaIntel Commercial Delta Estate Profile</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
            <span className="font-bold text-[#68776F] block uppercase tracking-wider text-[10px]">
              Geographic Location
            </span>
            <p className="font-bold text-[#172820] text-sm mt-1">
              {overview?.location || "Nellore Coastal Belt, Andhra Pradesh, India"}
            </p>
            <span className="text-[11px] text-[#68776F] mt-0.5 block font-mono">
              Coordinates: 14.4426° N, 79.9865° E
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
            <span className="font-bold text-[#68776F] block uppercase tracking-wider text-[10px]">
              Water Sourcing Architecture
            </span>
            <p className="font-bold text-[#172820] text-sm mt-1">
              Brackish Estuarine + Marine Borewell
            </p>
            <span className="text-[11px] text-[#68776F] mt-0.5 block tabular-nums">
              Salinity Range: 18 - 24 ppt
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
            <span className="font-bold text-[#68776F] block uppercase tracking-wider text-[10px]">
              Active Culture Species
            </span>
            <p className="font-bold text-[#172820] text-sm mt-1">
              Litopenaeus vannamei (SPF Broodstock)
            </p>
            <span className="text-[11px] text-[#68776F] mt-0.5 block tabular-nums">
              Stocking: 45 Post-Larvae (PL) / m²
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5]">
            <span className="font-bold text-[#68776F] block uppercase tracking-wider text-[10px]">
              Primary Power Architecture
            </span>
            <p className="font-bold text-[#172820] text-sm mt-1">
              125 kVA Silent DG + 40 kW Solar Grid
            </p>
            <span className="text-[11px] text-[#247653] font-semibold mt-0.5 block">
              Automatic Transfer Switch (ATS)
            </span>
          </div>
        </div>
      </div>

      {/* Feed & Probiotic Inventory */}
      <div className="soft-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3EAE5] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-[#247653]" />
            <h3 className="text-sm font-bold text-[#172820]">
              Warehouse Feed & Biosecurity Probiotics Inventory
            </h3>
          </div>
          <span className="text-xs text-[#68776F]">
            Dry Storage Warehouse Bay 02
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F8F6] text-[#68776F] font-semibold uppercase tracking-wider border-b border-[#E3EAE5]">
              <tr>
                <th className="py-3 px-4">Item & Formulation</th>
                <th className="py-3 px-4">Brand / Supplier</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Estimated Runway</th>
                <th className="py-3 px-4">Inventory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE5] text-[#172820]">
              {inventory.map((inv, idx) => (
                <tr key={idx} className="hover:bg-[#F6F8F6] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#172820]">{inv.item}</td>
                  <td className="py-3.5 px-4 text-[#68776F]">{inv.brand}</td>
                  <td className="py-3.5 px-4 font-bold tabular-nums">{inv.stockKg.toLocaleString()} kg</td>
                  <td className="py-3.5 px-4 tabular-nums">{inv.daysSupply} Days</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold ${
                        inv.status === "LOW_STOCK"
                          ? "badge-soft-warning"
                          : "badge-soft-success"
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
      <div className="soft-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3EAE5] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-[#247653]" />
            <h3 className="text-sm font-bold text-[#172820]">
              Technical Staff & Field Operating Roster
            </h3>
          </div>
          <span className="text-xs text-[#68776F]">
            24/7 Monitored Shifts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F8F6] text-[#68776F] font-semibold uppercase tracking-wider border-b border-[#E3EAE5]">
              <tr>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Shift Schedule</th>
                <th className="py-3 px-4">System Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE5] text-[#172820]">
              {employees.map((emp, idx) => (
                <tr key={idx} className="hover:bg-[#F6F8F6] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#172820]">{emp.name}</td>
                  <td className="py-3.5 px-4 text-[#68776F]">{emp.role}</td>
                  <td className="py-3.5 px-4 font-mono text-[#68776F]">{emp.phone}</td>
                  <td className="py-3.5 px-4 text-[#68776F]">{emp.shift}</td>
                  <td className="py-3.5 px-4">
                    <span className="badge-soft-info text-[10px] font-mono">
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
