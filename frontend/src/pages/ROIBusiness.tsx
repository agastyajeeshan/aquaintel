import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  TrendingUp,
  CircleDollarSign,
  PieChart,
  Calculator,
  ArrowRight,
  Info,
  CheckCircle,
  ShieldCheck,
  Zap,
  UtensilsCrossed,
  Users,
  Activity,
} from "lucide-react";

export const ROIBusiness: React.FC = () => {
  const [scenario, setScenario] = useState<string>("base");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Custom inputs for interactive scenario calculator
  const [farmArea, setFarmArea] = useState<number>(10.0);
  const [annualCrops, setAnnualCrops] = useState<number>(2.5);
  const [yieldPerHa, setYieldPerHa] = useState<number>(7500.0);
  const [shrimpPrice, setShrimpPrice] = useState<number>(420.0);
  const [feedPrice, setFeedPrice] = useState<number>(88.0);
  const [currentFcr, setCurrentFcr] = useState<number>(1.50);
  const [targetFcr, setTargetFcr] = useState<number>(1.25);
  const [iotCapexPerHa, setIotCapexPerHa] = useState<number>(220000.0);
  const [calculatedModel, setCalculatedModel] = useState<any>(null);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const res = await api.getROI();
      setData(res);
      setCalculatedModel(res.scenarios[scenario]);
    } catch (e) {
      console.warn("Failed to load ROI scenarios", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const handleScenarioChange = (newSc: string) => {
    setScenario(newSc);
    if (data?.scenarios?.[newSc]) {
      setCalculatedModel(data.scenarios[newSc]);
      if (newSc === "conservative") {
        setAnnualCrops(2.0);
        setYieldPerHa(6500.0);
        setCurrentFcr(1.55);
        setTargetFcr(1.35);
        setIotCapexPerHa(250000.0);
      } else if (newSc === "base") {
        setAnnualCrops(2.5);
        setYieldPerHa(7500.0);
        setCurrentFcr(1.50);
        setTargetFcr(1.25);
        setIotCapexPerHa(220000.0);
      } else if (newSc === "optimistic") {
        setAnnualCrops(2.8);
        setYieldPerHa(8500.0);
        setCurrentFcr(1.60);
        setTargetFcr(1.20);
        setIotCapexPerHa(200000.0);
      }
    }
  };

  const handleRecalculate = async () => {
    try {
      const res = await api.calculateROI({
        scenario,
        farm_area_ha: farmArea,
        ponds_count: 10,
        annual_crops: annualCrops,
        yield_per_ha_crop_kg: yieldPerHa,
        shrimp_sale_price_inr_kg: shrimpPrice,
        feed_price_inr_kg: feedPrice,
        current_fcr: currentFcr,
        target_fcr: targetFcr,
        iot_capex_per_ha_inr: iotCapexPerHa,
      });
      setCalculatedModel(res);
    } catch (e) {
      console.warn("Recalculation error", e);
    }
  };

  const model = calculatedModel || {
    capex_inr: 2200000,
    annual_opex_inr: 220000,
    annual_production_kg: 187500,
    annual_gross_revenue_inr: 78750000,
    feed_savings_inr: 4125000,
    energy_savings_inr: 324000,
    labor_savings_inr: 777600,
    disease_protection_inr: 10631250,
    total_annual_benefit_inr: 15857850,
    net_annual_benefit_inr: 15637850,
    payback_months: 1.7,
    roi_pct: 710.8,
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Commercial Viability & ROI Model (10-Hectare Farm)
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            CAPEX, OPEX, Feed Conversion Savings & Disease Loss Prevention Financials
          </p>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => handleScenarioChange("conservative")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scenario === "conservative"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Conservative
          </button>
          <button
            onClick={() => handleScenarioChange("base")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scenario === "base"
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Base Case
          </button>
          <button
            onClick={() => handleScenarioChange("optimistic")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scenario === "optimistic"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Optimistic
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer (Requirement 24) */}
      <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start space-x-3 shadow-subtle">
        <Info className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">
            COMMERCIAL FINANCIAL MODELING NOTICE:
          </p>
          <p className="text-teal-800 mt-0.5">
            <strong>Demo assumptions — replace with farm-specific quotations and operating data.</strong> Calculations benchmarked against standard semi-intensive Penaeus vannamei culture in coastal Andhra Pradesh, India.
          </p>
        </div>
      </div>

      {/* Primary ROI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total CAPEX */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Initial IoT CAPEX (10 Ha)
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            ₹{(model.capex_inr / 100000).toFixed(2)} <span className="text-sm font-normal text-slate-500">Lakhs</span>
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            ₹{(model.capex_inr / 10).toLocaleString()} / Hectare complete
          </span>
        </div>

        {/* Annual Net Financial Benefit */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-subtle">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
            Annual Net Benefit
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            ₹{(model.net_annual_benefit_inr / 100000).toFixed(2)} <span className="text-sm font-normal text-emerald-600">Lakhs</span>
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            Post annual OPEX deduction
          </span>
        </div>

        {/* Payback Period */}
        <div className="bg-white p-5 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-subtle">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">
            Payback Period
          </span>
          <p className="text-2xl font-black text-teal-800 mt-1">
            {model.payback_months} <span className="text-sm font-normal text-teal-600">Months</span>
          </p>
          <span className="text-[11px] text-teal-700 font-semibold">
            Under 1 crop cycle (DOC 100)
          </span>
        </div>

        {/* Annual ROI */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Return on Investment (ROI)
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {model.roi_pct}%
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            High-yield commercial return
          </span>
        </div>
      </div>

      {/* Breakdown of Annual Financial Savings by Category */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <h2 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100">
          Annual Economic Benefits Breakdown by Technology Layer
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Feed Savings */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
              <UtensilsCrossed className="h-4 w-4" />
              <span>Smart Feed Optimization</span>
            </div>
            <p className="text-xl font-black text-slate-900">
              ₹{(model.feed_savings_inr / 100000).toFixed(2)} Lakhs
            </p>
            <p className="text-xs text-slate-500">
              FCR reduction from {currentFcr} to {targetFcr} saves {(model.feed_saved_kg || 46875).toLocaleString()} kg of high-protein pellet.
            </p>
          </div>

          {/* Disease Mortality Protection */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm">
              <Activity className="h-4 w-4" />
              <span>Disease Loss Prevention</span>
            </div>
            <p className="text-xl font-black text-slate-900">
              ₹{(model.disease_protection_inr / 100000).toFixed(2)} Lakhs
            </p>
            <p className="text-xs text-slate-500">
              Early warning prevents devastating viral mortality crashes (WSSV / AHPND / Vibriosis).
            </p>
          </div>

          {/* Energy Optimization */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm">
              <Zap className="h-4 w-4" />
              <span>Automated Aeration Energy</span>
            </div>
            <p className="text-xl font-black text-slate-900">
              ₹{(model.energy_savings_inr / 100000).toFixed(2)} Lakhs
            </p>
            <p className="text-xs text-slate-500">
              Smart DO hysteresis prevents unnecessary midday aerator running while maintaining oxygen saturation.
            </p>
          </div>

          {/* Labor Optimization */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm">
              <Users className="h-4 w-4" />
              <span>Labor Efficiency Gain</span>
            </div>
            <p className="text-xl font-black text-slate-900">
              ₹{(model.labor_savings_inr / 100000).toFixed(2)} Lakhs
            </p>
            <p className="text-xs text-slate-500">
              Automated feeding & remote IoT telemetry reduces manual check-tray and paddlewheel switching hours.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Assumptions Calculator (Requirement 24) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-teal-700" />
            <h2 className="text-base font-black text-slate-900">
              Interactive Financial Sensitivity Assumptions
            </h2>
          </div>
          <button
            onClick={handleRecalculate}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-sm transition-colors"
          >
            Update & Recalculate Model
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold text-slate-700">
          <div>
            <label className="block mb-1">Crops Per Year</label>
            <input
              type="number"
              step="0.1"
              value={annualCrops}
              onChange={(e) => setAnnualCrops(parseFloat(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block mb-1">Yield / Ha / Crop (kg)</label>
            <input
              type="number"
              step="100"
              value={yieldPerHa}
              onChange={(e) => setYieldPerHa(parseFloat(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block mb-1">Shrimp Sale Price (₹ / kg)</label>
            <input
              type="number"
              value={shrimpPrice}
              onChange={(e) => setShrimpPrice(parseFloat(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block mb-1">Commercial Feed Price (₹ / kg)</label>
            <input
              type="number"
              value={feedPrice}
              onChange={(e) => setFeedPrice(parseFloat(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block mb-1">Current Baseline FCR</label>
            <input
              type="number"
              step="0.05"
              value={currentFcr}
              onChange={(e) => setCurrentFcr(parseFloat(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block mb-1">Target Smart FCR</label>
            <input
              type="number"
              step="0.05"
              value={targetFcr}
              onChange={(e) => setTargetFcr(parseFloat(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold text-teal-700"
            />
          </div>

          <div>
            <label className="block mb-1">IoT CAPEX / Ha (₹)</label>
            <input
              type="number"
              step="10000"
              value={iotCapexPerHa}
              onChange={(e) => setIotCapexPerHa(parseFloat(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRecalculate}
              className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-black"
            >
              Apply Values
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
