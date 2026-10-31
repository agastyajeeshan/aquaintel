"""
AquaIntel — Climate Adaptation & Predictive Intelligence Router
REST endpoints for real-time weather observations, forecasts,
pond-specific climate stressor analysis, multi-horizon forecasts, and operator approvals.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import Pond, Sensor, ClimateAdaptationEvent, WeatherObservation, WeatherForecast
from ..core.weather_service import weather_service, WeatherData
from ..core.climate_engine import climate_engine
from ..core.predictive_models import PondPredictiveEngine

router = APIRouter(prefix="/climate", tags=["Climate Adaptation & Predictive Intelligence"])

class ScenarioInjectionRequest(BaseModel):
    scenario: str = Field(..., description="SUMMER_RAIN, RAINY_SUNSHINE, HEAVY_RAIN, HOT_AFTERNOON, COLD_SNAP, RESET")
    custom_parameters: Optional[Dict[str, Any]] = None

class OperatorApprovalRequest(BaseModel):
    action_type: str = Field(..., description="AERATION or FEEDING")
    notes: Optional[str] = None

@router.get("/weather/current")
def get_current_weather():
    """Returns current real-time or cached weather conditions with provider metadata."""
    weather = weather_service.get_current_weather()
    return {
        "status": "SUCCESS",
        "weather": weather.to_dict(),
        "provider": weather.provider_name,
        "is_simulated": weather.is_simulated,
        "data_freshness_seconds": weather.data_freshness_seconds
    }

@router.get("/weather/forecast")
def get_weather_forecast(horizons_hours: int = Query(72, ge=6, le=168)):
    """Returns hourly atmospheric forecast timeline up to 168 hours (7 days)."""
    forecast = weather_service.get_weather_forecast(horizons_hours=horizons_hours)
    return {
        "status": "SUCCESS",
        "forecast": forecast
    }

@router.get("/analysis")
def get_fleet_climate_analysis(db: Session = Depends(get_db)):
    """
    Evaluates dynamic climate stressors across all 10 ponds in the facility.
    Does not assume static seasons; combines live weather with real pond readings.
    """
    weather = weather_service.get_current_weather()
    forecast_data = weather_service.get_weather_forecast(horizons_hours=24)
    timeline = forecast_data.get("timeline", [])

    ponds = db.query(Pond).filter(Pond.is_archived == False).all()
    results = []

    for pond in ponds:
        # Extract latest sensor readings for this pond
        sensors = db.query(Sensor).filter(Sensor.pond_id == pond.id).all()
        sensor_map = {s.sensor_type: s.current_value for s in sensors}

        water_temp = sensor_map.get("temperature", 29.2)
        do_val = sensor_map.get("do", 6.1)
        salinity_val = sensor_map.get("salinity", 20.0)
        ph_val = sensor_map.get("ph", 8.0)
        tan_val = sensor_map.get("ammonia", 0.04)
        water_level = sensor_map.get("water_level", 1.25)

        pond_analysis = climate_engine.analyze_pond_climate(
            pond_id=pond.id,
            pond_name=pond.name,
            biomass_kg=pond.estimated_biomass_kg,
            water_temp=water_temp,
            do_mg_l=do_val,
            salinity_ppt=salinity_val,
            ph=ph_val,
            tan_mg_l=tan_val,
            water_level_m=water_level,
            weather=weather,
            forecast_timeline=timeline
        )
        results.append(pond_analysis)

    return {
        "status": "SUCCESS",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "weather_summary": weather.to_dict(),
        "ponds_evaluated": len(results),
        "fleet_analysis": results
    }

@router.get("/ponds/{pond_id}/analysis")
def get_pond_climate_analysis(pond_id: int, db: Session = Depends(get_db)):
    """Deep-dive climate adaptation analysis for a specific pond."""
    pond = db.query(Pond).filter(Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    weather = weather_service.get_current_weather()
    forecast_data = weather_service.get_weather_forecast(horizons_hours=24)
    timeline = forecast_data.get("timeline", [])

    sensors = db.query(Sensor).filter(Sensor.pond_id == pond.id).all()
    sensor_map = {s.sensor_type: s.current_value for s in sensors}

    pond_analysis = climate_engine.analyze_pond_climate(
        pond_id=pond.id,
        pond_name=pond.name,
        biomass_kg=pond.estimated_biomass_kg,
        water_temp=sensor_map.get("temperature", 29.2),
        do_mg_l=sensor_map.get("do", 6.1),
        salinity_ppt=sensor_map.get("salinity", 20.0),
        ph=ph_val if (ph_val := sensor_map.get("ph")) else 8.0,
        tan_mg_l=sensor_map.get("ammonia", 0.04),
        water_level_m=sensor_map.get("water_level", 1.25),
        weather=weather,
        forecast_timeline=timeline
    )

    return pond_analysis

@router.get("/ponds/{pond_id}/forecast")
def get_pond_multi_horizon_forecast(pond_id: int, db: Session = Depends(get_db)):
    """
    Calculates multi-horizon forecasts (3h, 6h, 12h, 24h, 72h, 7d)
    with 90% confidence uncertainty intervals and baseline comparisons.
    """
    pond = db.query(Pond).filter(Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    forecast_data = weather_service.get_weather_forecast(horizons_hours=168)
    timeline = forecast_data.get("timeline", [])

    sensors = db.query(Sensor).filter(Sensor.pond_id == pond.id).all()
    sensor_map = {s.sensor_type: s.current_value for s in sensors}

    pond_data = {
        "id": pond.id,
        "name": pond.name,
        "estimated_biomass_kg": pond.estimated_biomass_kg,
        "current_age_days": pond.current_age_days
    }

    forecast_res = PondPredictiveEngine.generate_multi_horizon_forecast(
        pond_data=pond_data,
        weather_timeline=timeline,
        current_readings=sensor_map
    )

    return forecast_res

@router.get("/ponds/{pond_id}/recommendations")
def get_pond_climate_recommendations(pond_id: int, db: Session = Depends(get_db)):
    """Returns pond-specific adaptive feeding and aeration recommendations with explainable reasons."""
    pond_analysis = get_pond_climate_analysis(pond_id, db)
    return {
        "pond_id": pond_id,
        "pond_name": pond_analysis["pond_name"],
        "condition": pond_analysis["active_condition"],
        "adaptive_recommendations": pond_analysis["adaptive_recommendations"],
        "safety_interlocks_active": pond_analysis["adaptive_recommendations"]["recommended_feed_adjustment_pct"] < 0
    }

@router.post("/ponds/{pond_id}/approve")
def approve_climate_recommendation(
    pond_id: int,
    approval: OperatorApprovalRequest,
    db: Session = Depends(get_db)
):
    """
    Enforces operator sign-off before physical feed rate or aeration schedule overrides take effect.
    Logs event to ClimateAdaptationEvent table.
    """
    pond = db.query(Pond).filter(Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    event = ClimateAdaptationEvent(
        pond_id=pond_id,
        condition_key="OPERATOR_APPROVAL",
        title=f"Operator Sign-off: {approval.action_type}",
        severity="NORMAL",
        detected_stressors=[f"Action {approval.action_type} approved by operator with notes: {approval.notes or 'None'}"],
        aeration_action="CONFIRMED",
        feeding_action="CONFIRMED",
        feed_adjustment_pct=0.0,
        recommendations=["Action executed under operator authorization."],
        operator_approved=True
    )
    db.add(event)
    db.commit()

    return {
        "status": "APPROVED",
        "pond_id": pond_id,
        "action_type": approval.action_type,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "message": f"Operator approval verified for {approval.action_type} in {pond.name}."
    }

@router.get("/models/performance")
def get_climate_model_performance():
    """Returns chronological walk-forward benchmark metrics (MAE, RMSE) against baselines."""
    benchmarks = PondPredictiveEngine.get_model_benchmarks()
    return {
        "status": "SUCCESS",
        "benchmarks": benchmarks
    }

@router.post("/simulate")
def inject_climate_scenario(request: ScenarioInjectionRequest):
    """
    Demonstration and stress-testing endpoint to simulate dynamic weather anomalies:
    - SUMMER_RAIN: Hot day + sudden rainstorm
    - RAINY_SUNSHINE: Monsoon rain followed by solar flare
    - HEAVY_RAIN: Torrential downpour & salinity shock
    - HOT_AFTERNOON: 38°C heatwave & hypoxia risk
    - COLD_SNAP: Chilled water & digestive slowdown
    - RESET: Return to live weather API / empirical baseline
    """
    scenario = request.scenario.upper()
    if scenario in ["RESET", "CLEAR", "NORMAL"]:
        weather_service.set_scenario_override(None)
        return {
            "status": "RESET",
            "message": "Climate simulation reset to live meteorological provider."
        }
    
    valid_scenarios = ["SUMMER_RAIN", "RAINY_SUNSHINE", "HEAVY_RAIN", "HOT_AFTERNOON", "COLD_SNAP"]
    if scenario not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario. Supported scenarios: {', '.join(valid_scenarios + ['RESET'])}"
        )

    weather_service.set_scenario_override(scenario, request.custom_parameters)
    current = weather_service.get_current_weather()

    return {
        "status": "SCENARIO_ACTIVE",
        "scenario": scenario,
        "simulated_weather": current.to_dict(),
        "message": f"Dynamic climate scenario '{scenario}' successfully injected across all farm telemetry."
    }
