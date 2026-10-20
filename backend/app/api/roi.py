from fastapi import APIRouter
from typing import Dict, Any
from ..schemas import ROIInputs

router = APIRouter(prefix="/roi", tags=["ROI & Business Viability"])

SCENARIO_DEFAULTS = {
    "conservative": {
        "annual_crops": 2.0,
        "yield_per_ha_crop_kg": 6500.0,
        "shrimp_sale_price_inr_kg": 390.0,
        "feed_price_inr_kg": 90.0,
        "current_fcr": 1.55,
        "target_fcr": 1.35,  # 0.20 FCR saving
        "energy_savings_pct": 16.0,
        "labor_savings_pct": 20.0,
        "disease_loss_reduced_pct": 8.0,  # from 18% down to 10%
        "iot_capex_per_ha_inr": 250000.0
    },
    "base": {
        "annual_crops": 2.5,
        "yield_per_ha_crop_kg": 7500.0,
        "shrimp_sale_price_inr_kg": 420.0,
        "feed_price_inr_kg": 88.0,
        "current_fcr": 1.50,
        "target_fcr": 1.25,  # 0.25 FCR saving
        "energy_savings_pct": 24.0,
        "labor_savings_pct": 30.0,
        "disease_loss_reduced_pct": 13.5, # from 18% down to 4.5%
        "iot_capex_per_ha_inr": 220000.0
    },
    "optimistic": {
        "annual_crops": 2.8,
        "yield_per_ha_crop_kg": 8500.0,
        "shrimp_sale_price_inr_kg": 450.0,
        "feed_price_inr_kg": 86.0,
        "current_fcr": 1.60,
        "target_fcr": 1.20,  # 0.40 FCR saving
        "energy_savings_pct": 30.0,
        "labor_savings_pct": 40.0,
        "disease_loss_reduced_pct": 15.0, # from 20% down to 5%
        "iot_capex_per_ha_inr": 200000.0
    }
}

@router.get("")
def get_roi_scenarios():
    results = {}
    for sc_name, sc_data in SCENARIO_DEFAULTS.items():
        results[sc_name] = compute_roi_model(
            farm_area_ha=10.0,
            annual_crops=sc_data["annual_crops"],
            yield_per_ha_crop_kg=sc_data["yield_per_ha_crop_kg"],
            shrimp_sale_price_inr_kg=sc_data["shrimp_sale_price_inr_kg"],
            feed_price_inr_kg=sc_data["feed_price_inr_kg"],
            current_fcr=sc_data["current_fcr"],
            target_fcr=sc_data["target_fcr"],
            energy_savings_pct=sc_data["energy_savings_pct"],
            labor_savings_pct=sc_data["labor_savings_pct"],
            disease_loss_reduced_pct=sc_data["disease_loss_reduced_pct"],
            iot_capex_per_ha_inr=sc_data["iot_capex_per_ha_inr"]
        )
    return {
        "disclaimer": "Demo assumptions — replace with farm-specific quotations and operating data.",
        "farm_profile": "10-Hectare Commercial Penaeus vannamei Farm in India (10 x 1ha ponds)",
        "scenarios": results
    }

@router.post("/calculate")
def calculate_custom_roi(inputs: ROIInputs):
    base_params = SCENARIO_DEFAULTS.get(inputs.scenario, SCENARIO_DEFAULTS["base"])
    fcr_diff = max(0.05, inputs.current_fcr - inputs.target_fcr)
    disease_diff = max(0.0, inputs.disease_loss_rate_traditional_pct - inputs.disease_loss_rate_aquaintel_pct)
    
    result = compute_roi_model(
        farm_area_ha=inputs.farm_area_ha,
        annual_crops=inputs.annual_crops,
        yield_per_ha_crop_kg=inputs.yield_per_ha_crop_kg,
        shrimp_sale_price_inr_kg=inputs.shrimp_sale_price_inr_kg,
        feed_price_inr_kg=inputs.feed_price_inr_kg,
        current_fcr=inputs.current_fcr,
        target_fcr=inputs.target_fcr,
        energy_savings_pct=base_params["energy_savings_pct"],
        labor_savings_pct=base_params["labor_savings_pct"],
        disease_loss_reduced_pct=disease_diff,
        iot_capex_per_ha_inr=inputs.iot_capex_per_ha_inr
    )
    result["disclaimer"] = "Demo assumptions — replace with farm-specific quotations and operating data."
    return result

def compute_roi_model(
    farm_area_ha: float,
    annual_crops: float,
    yield_per_ha_crop_kg: float,
    shrimp_sale_price_inr_kg: float,
    feed_price_inr_kg: float,
    current_fcr: float,
    target_fcr: float,
    energy_savings_pct: float,
    labor_savings_pct: float,
    disease_loss_reduced_pct: float,
    iot_capex_per_ha_inr: float
) -> Dict[str, Any]:
    # 1. Production output
    annual_production_kg = farm_area_ha * yield_per_ha_crop_kg * annual_crops
    annual_gross_revenue_inr = annual_production_kg * shrimp_sale_price_inr_kg

    # 2. Feed savings calculation
    fcr_saving = current_fcr - target_fcr
    annual_feed_saved_kg = annual_production_kg * fcr_saving
    annual_feed_savings_inr = annual_feed_saved_kg * feed_price_inr_kg

    # 3. Energy savings (Aeration ~ 18,000 kWh / ha / year)
    baseline_energy_kwh = farm_area_ha * 18000.0
    kwh_saved = baseline_energy_kwh * (energy_savings_pct / 100.0)
    annual_energy_savings_inr = kwh_saved * 7.50

    # 4. Labor savings (12 field laborers @ ₹18,000/month = ₹25.92L/year)
    baseline_annual_labor_inr = 12 * 18000 * 12
    annual_labor_savings_inr = baseline_annual_labor_inr * (labor_savings_pct / 100.0)

    # 5. Disease mortality prevention savings
    annual_disease_protection_inr = annual_gross_revenue_inr * (disease_loss_reduced_pct / 100.0)

    # 6. Total Annual Financial Benefit
    total_annual_benefit_inr = (
        annual_feed_savings_inr +
        annual_energy_savings_inr +
        annual_labor_savings_inr +
        annual_disease_protection_inr
    )

    # 7. CAPEX & OPEX
    total_capex_inr = farm_area_ha * iot_capex_per_ha_inr
    annual_opex_inr = total_capex_inr * 0.10  # 10% annual maintenance & cloud/SIM fees
    net_annual_benefit_inr = total_annual_benefit_inr - annual_opex_inr

    # 8. Payback & ROI
    payback_years = total_capex_inr / net_annual_benefit_inr if net_annual_benefit_inr > 0 else 99
    payback_months = round(payback_years * 12, 1)
    roi_pct = round((net_annual_benefit_inr / total_capex_inr) * 100, 1)

    return {
        "capex_inr": round(total_capex_inr, 0),
        "annual_opex_inr": round(annual_opex_inr, 0),
        "annual_production_kg": round(annual_production_kg, 0),
        "annual_gross_revenue_inr": round(annual_gross_revenue_inr, 0),
        "feed_savings_inr": round(annual_feed_savings_inr, 0),
        "feed_saved_kg": round(annual_feed_saved_kg, 0),
        "energy_savings_inr": round(annual_energy_savings_inr, 0),
        "energy_kwh_saved": round(kwh_saved, 0),
        "labor_savings_inr": round(annual_labor_savings_inr, 0),
        "disease_protection_inr": round(annual_disease_protection_inr, 0),
        "total_annual_benefit_inr": round(total_annual_benefit_inr, 0),
        "net_annual_benefit_inr": round(net_annual_benefit_inr, 0),
        "payback_months": payback_months,
        "roi_pct": roi_pct
    }
