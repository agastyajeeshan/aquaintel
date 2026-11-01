import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Calculator,
  Info,
  Zap,
  UtensilsCrossed,
  Users,
  Activity,
  CircleDollarSign,
  Loader2,
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
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#E3F3E9] text-[#247653]">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#172820] tracking-tight">
              Commercial Viability & ROI Model (10-Hectare Farm)
            </h1>
          </div>
          <p className="text-sm text-[#68776F] mt-1">
            CAPEX, OPEX, Feed Conversion Savings & Disease Loss Prevention Financials
          </p>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-[#E3EAE5] shadow-soft text-xs font-semibold">
          <button
            onClick={() => handleScenarioChange("conservative")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scenario === "conservative"
                ? "bg-[#247653] text-white shadow-soft"
                : "text-[#68776F] hover:text-[#172820]"
            }`}
          >
            Conservative
          </button>
          <button
            onClick={() => handleScenarioChange("base")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scenario === "base"
                ? "bg-[#247653] text-white shadow-soft"
                : "text-[#68776F] hover:text-[#172820]"
            }`}
          >
            Base Case
          </button>
          <button
            onClick={() => handleScenarioChange("optimistic")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scenario === "optimistic"
                ? "bg-[#247653] text-white shadow-soft"
                : "text-[#68776F] hover:text-[#172820]"
            }`}
          >
            Optimistic
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs flex items-start space-x-3 shadow-soft">
        <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold tracking-wide">
            COMMERCIAL FINANCIAL MODELING NOTICE:
          </p>
          <p className="text-amber-900 leading-relaxed">
            <strong>Demonstration financial assumptions — calibrate with site-specific quotations, electricity tariffs, and farm operating history.</strong> Calculations benchmarked against standard commercial Penaeus vannamei culture in coastal Andhra Pradesh, India.
          </p>
        </div>
      </div>

      {/* Primary ROI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total CAPEX */}
        <div className="soft-card p-5">
          <span className="text-xs font-bold text-[#68776F] uppercase tracking-wider block">
            Initial IoT CAPEX (10 Ha)
          </span>
          <p className="text-2xl font-bold text-[#172820] tabular-nums mt-1">
            ₹{(model.capex_inr / 100000).toFixed(2)} <span className="text-sm font-normal text-[#68776F]">Lakhs</span>
          </p>
          <span className="text-[11px] text-[#68776F] tabular-nums">
            ₹{(model.capex_inr / 10).toLocaleString()} / Hectare complete
          </span>
        </div>

        {/* Annual Net Financial Benefit */}
        <div className="soft-card p-5 bg-[#E3F3E9]/30 border-[#247653]/30">
          <span className="text-xs font-bold text-[#247653] uppercase tracking-wider block">
            Annual Net Benefit
          </span>
          <p className="text-2xl font-bold text-[#21845A] tabular-nums mt-1">
            ₹{(model.net_annual_benefit_inr / 100000).toFixed(2)} <span className="text-sm font-normal text-[#21845A]">Lakhs</span>
          </p>
          <span className="text-[11px] text-[#21845A] font-semibold">
            Post annual OPEX deduction
          </span>
        </div>

        {/* Payback Period */}
        <div className="soft-card p-5">
          <span className="text-xs font-bold text-[#168B91] uppercase tracking-wider block">
            Payback Period
          </span>
          <p className="text-2xl font-bold text-[#168B91] tabular-nums mt-1">
            {model.payback_months} <span className="text-sm font-normal text-[#68776F]">Months</span>
          </p>
          <span className="text-[11px] text-[#168B91] font-semibold">
            Under 1 crop cycle (DOC 100)
          </span>
        </div>

        {/* Annual ROI */}
        <div className="soft-card p-5">
          <span className="text-xs font-bold text-[#68776F] uppercase tracking-wider block">
            Return on Investment (ROI)
          </span>
          <p className="text-2xl font-bold text-[#172820] tabular-nums mt-1">
            {model.roi_pct}%
          </p>
          <span className="text-[11px] text-[#21845A] font-semibold">
            High-yield commercial return
          </span>
        </div>
      </div>

      {/* Breakdown of Annual Financial Savings by Category */}
      <div className="soft-card p-6 space-y-4">
        <h2 className="text-base font-bold text-[#172820] pb-3 border-b border-[#E3EAE5]">
          Annual Economic Benefits Breakdown by Technology Layer
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Feed Savings */}
          <div className="p-4 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] space-y-2">
            <div className="flex items-center space-x-2 text-[#247653] font-bold text-sm">
              <UtensilsCrossed className="h-4 w-4" />
              <span>Smart Feed Optimization</span>
            </div>
            <p className="text-xl font-bold text-[#172820] tabular-nums">
              ₹{(model.feed_savings_inr / 100000).toFixed(2)} Lakhs
            </p>
            <p className="text-xs text-[#68776F] leading-relaxed">
              FCR reduction from {currentFcr} to {targetFcr} saves {(model.feed_saved_kg || 46875).toLocaleString()} kg of high-protein pellet.
            </p>
          </div>

          {/* Disease Mortality Protection */}
          <div className="p-4 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] space-y-2">
            <div className="flex items-center space-x-2 text-[#C84040] font-bold text-sm">
              <Activity className="h-4 w-4" />
              <span>Disease Loss Prevention</span>
            </div>
            <p className="text-xl font-bold text-[#172820] tabular-nums">
              ₹{(model.disease_protection_inr / 100000).toFixed(2)} Lakhs
            </p>
            <p className="text-xs text-[#68776F] leading-relaxed">
              Early warning prevents devastating viral mortality crashes (WSSV / AHPND / Vibriosis).
            </p>
          </div>

          {/* Energy Optimization */}
          <div className="p-4 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] space-y-2">
            <div className="flex items-center space-x-2 text-[#B7791F] font-bold text-sm">
              <Zap className="h-4 w-4" />
              <span>Automated Aeration Energy</span>
            </div>
            <p className="text-xl font-bold text-[#172820] tabular-nums">
              ₹{(model.energy_savings_inr / 100000).toFixed(2)} Lakhs
            </p>
            <p className="text-xs text-[#68776F] leading-relaxed">
              Smart DO hysteresis prevents unnecessary midday aerator running while maintaining oxygen saturation.
            </p>
          </div>

          {/* Labor Optimization */}
          <div className="p-4 rounded-xl border border-[#E3EAE5] bg-[#F6F8F6] space-y-2">
            <div className="flex items-center space-x-2 text-[#3478B8] font-bold text-sm">
              <Users className="h-4 w-4" />
              <span>Labor Efficiency Gain</span>
            </div>
            <p className="text-xl font-bold text-[#172820] tabular-nums">
              ₹{(model.labor_savings_inr / 100000).toFixed(2)} Lakhs
            </p>
            <p className="text-xs text-[#68776F] leading-relaxed">
              Automated feeding & remote IoT telemetry reduces manual check-tray and paddlewheel switching hours.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Assumptions Calculator */}
      <div className="soft-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#E3EAE5] gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#E3F3E9] text-[#247653]">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172820]">
                Interactive Financial Sensitivity Assumptions
              </h2>
              <p className="text-xs text-[#68776F]">Dynamically adjust operational variables to stress-test your farm economics</p>
            </div>
          </div>
          <button
            onClick={handleRecalculate}
            className="btn-primary text-xs py-2 px-4"
          >
            Update & Recalculate Model
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold text-[#172820]">
          <div>
            <label className="block mb-1 text-[#68776F]">Crops Per Year</label>
            <input
              type="number"
              step="0.1"
              value={annualCrops}
              onChange={(e) => setAnnualCrops(parseFloat(e.target.value))}
              className="soft-input w-full font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">Yield / Ha / Crop (kg)</label>
            <input
              type="number"
              step="100"
              value={yieldPerHa}
              onChange={(e) => setYieldPerHa(parseFloat(e.target.value))}
              className="soft-input w-full font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">Shrimp Sale Price (₹ / kg)</label>
            <input
              type="number"
              value={shrimpPrice}
              onChange={(e) => setShrimpPrice(parseFloat(e.target.value))}
              className="soft-input w-full font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">Commercial Feed Price (₹ / kg)</label>
            <input
              type="number"
              value={feedPrice}
              onChange={(e) => setFeedPrice(parseFloat(e.target.value))}
              className="soft-input w-full font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">Current Baseline FCR</label>
            <input
              type="number"
              step="0.05"
              value={currentFcr}
              onChange={(e) => setCurrentFcr(parseFloat(e.target.value))}
              className="soft-input w-full font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">Target Smart FCR</label>
            <input
              type="number"
              step="0.05"
              value={targetFcr}
              onChange={(e) => setTargetFcr(parseFloat(e.target.value))}
              className="soft-input w-full font-bold text-[#247653] tabular-nums"
            />
          </div>

          <div>
            <label className="block mb-1 text-[#68776F]">IoT CAPEX / Ha (₹)</label>
            <input
              type="number"
              step="10000"
              value={iotCapexPerHa}
              onChange={(e) => setIotCapexPerHa(parseFloat(e.target.value))}
              className="soft-input w-full font-bold tabular-nums"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRecalculate}
              className="btn-secondary w-full py-2.5 text-xs font-bold"
            >
              Apply Values
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-2 text-xs text-[#68776F] flex items-center justify-center space-x-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#247653]" />
          <span>Updating financial scenario matrix...</span>
        </div>
      )}
    </div>
  );
};
