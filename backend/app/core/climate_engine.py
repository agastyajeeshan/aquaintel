"""
AquaIntel — Dynamic Climate Adaptation Engine
Synthesizes actual weather observations, numerical weather forecasts,
real-time pond multi-probe telemetry, biomass, and equipment state.
Identifies dynamic multi-stressor climate anomalies without assuming static seasonal stereotypes.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from .weather_service import weather_service, WeatherData
from .predictive_models import PondPredictiveEngine

class ClimateAdaptationEngine:
    """
    Evaluates real-time micro-climate stressors and predicts physiological impacts on Penaeus vannamei.
    Dynamically classifies complex weather-water interactions:
    - SUMMER_RAIN: Rainfall after hot dry conditions -> thermal inversion, rapid dilution, DO crash
    - RAINY_SUNSHINE: Monsoon rain followed by solar flare -> algae bloom supersaturation then nocturnal crash
    - HEAVY_RAIN: Severe freshwater inundation -> salinity shock, mineral dilution, pH crash
    - HOT_AFTERNOON: Extreme solar heat -> metabolic acceleration, low DO saturation ceiling
    - COOL_NIGHT: Sudden cold influx -> gut dormancy, uneaten pellet hazard
    - SENSOR_WEATHER_CONFLICT: Discrepancy between weather station and pond sensors (e.g., probe fouling)
    """

    @classmethod
    def analyze_pond_climate(
        cls,
        pond_id: int,
        pond_name: str,
        biomass_kg: float,
        water_temp: float,
        do_mg_l: float,
        salinity_ppt: float,
        ph: float,
        tan_mg_l: float,
        water_level_m: float,
        weather: Optional[WeatherData] = None,
        forecast_timeline: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        if not weather:
            weather = weather_service.get_current_weather()
        
        now = datetime.now(timezone.utc)
        
        # Calculate derived biological estimates
        nh3_toxic = PondPredictiveEngine.calculate_unionized_nh3(tan_mg_l, ph, water_temp, salinity_ppt)
        do_saturation = PondPredictiveEngine.calculate_do_saturation(water_temp, salinity_ppt)
        do_saturation_pct = round((do_mg_l / max(0.1, do_saturation)) * 100.0, 1)

        # Weather observations
        air_temp = weather.air_temperature_c
        rain_mm = weather.rainfall_mm
        solar_rad = weather.solar_radiation_wm2
        humidity = weather.relative_humidity_pct
        wind_speed = weather.wind_speed_kmh

        # Compute near-term forecast cumulative rain (next 6h)
        next_6h_rain = 0.0
        if forecast_timeline:
            next_6h_rain = sum(f.get("rainfall_mm", 0.0) for f in forecast_timeline[:6])

        # Active Dynamic Condition Classifier
        condition_key = "NORMAL_EQUILIBRIUM"
        condition_title = "Normal Physiological Equilibrium"
        condition_severity = "NORMAL"
        detected_stressors = []
        actionable_recommendations = []
        aeration_instruction = "MAINTAIN_STANDARD_SCHEDULE"
        feeding_instruction = "MAINTAIN_RECOMMENDED_RATION"
        feed_adjustment_pct = 0.0

        # Condition 1: HEAVY RAINFALL EVENT (Torrential Inundation)
        # Severe rainfall >= 25 mm or cumulative forecast >= 40 mm
        if rain_mm >= 25.0 or next_6h_rain >= 40.0:
            condition_key = "HEAVY_RAIN"
            condition_title = "Severe Tropical Downpour & Freshwater Inundation"
            condition_severity = "CRITICAL"
            detected_stressors.append(
                f"Heavy precipitation ({rain_mm:.1f} mm recorded, {next_6h_rain:.1f} mm forecast next 6h) "
                f"causes water level rise to {water_level_m:.2f} m and dilutes pond salinity ({salinity_ppt:.1f} ppt)."
            )
            detected_stressors.append(
                "Acidic rainwater runoff from pond dikes suppresses alkalinity and precipitates mineral loss."
            )
            aeration_instruction = "CONTINUOUS_SURFACE_AERATION"
            feeding_instruction = "HALT_ALL_FEEDING"
            feed_adjustment_pct = -100.0
            actionable_recommendations.append("Inspect drainage sluice gates and lower overflow weir boards to prevent pond overtopping.")
            actionable_recommendations.append("Broad-cast agricultural limestone (CaCO3) along pond dikes at 100 kg/Ha to buffer pH crash.")
            actionable_recommendations.append("Completely halt automated feeding during torrential rain; shrimp remain dormant at pond bottom.")

        # Condition 2: SUMMER + UNEXPECTED RAIN
        # High background temperature (water >= 29.0°C or air >= 30.0°C) with sudden rain shower
        elif (air_temp >= 30.0 or water_temp >= 29.0) and (rain_mm >= 3.0 or (next_6h_rain >= 8.0 and rain_mm > 0.0)):
            condition_key = "SUMMER_RAIN"
            condition_title = "Summer Heat with Unexpected Rain Influx"
            condition_severity = "HIGH"
            detected_stressors.append(
                f"Sudden rain ({rain_mm:.1f} mm) falling on hot pond water ({water_temp:.1f}°C) triggers "
                f"rapid surface thermal layering and wash-in of organic dike runoff."
            )
            detected_stressors.append(
                "Freshwater lens formation risks vertical DO stratification and benthic oxygen deficit."
            )
            aeration_instruction = "ACTIVATE_VERTICAL_MIXING"
            feeding_instruction = "SUSPEND_FEEDING_UNTIL_STABILIZED"
            feed_adjustment_pct = -60.0
            actionable_recommendations.append("Engage bottom jet aerators or deep-draft paddlewheels to break thermal and salinity stratification.")
            actionable_recommendations.append("Reduce feed batch by 60% or suspend check-tray dispensing to avoid unconsumed pellet spoilage.")
            actionable_recommendations.append("Test salinity after rain event; prepare agricultural gypsum / mineral salts if salinity drops > 3 ppt.")

        # Condition 3: RAINY SEASON + INTENSE SUNSHINE
        # High humidity / recent rain with intense solar radiation >= 700 W/m2 and dry current conditions
        elif humidity >= 70.0 and solar_rad >= 700.0 and rain_mm <= 2.0:
            condition_key = "RAINY_SUNSHINE"
            condition_title = "Post-Rain High Solar Flare & Algal Bloom Risk"
            condition_severity = "WARNING"
            detected_stressors.append(
                f"Intense solar radiation ({solar_rad:.0f} W/m²) combined with high ambient humidity ({humidity:.0f}%) "
                f"accelerates microalgae photosynthesis, pushing DO to {do_mg_l:.1f} mg/L ({do_saturation_pct}% sat)."
            )
            detected_stressors.append(
                "Excessive daytime oxygen supersaturation (> 120%) signals severe nocturnal algal respiration crash between 02:00 and 06:00."
            )
            aeration_instruction = "OPTIMIZE_DAY_PRIME_NIGHT_BOOST"
            feeding_instruction = "MODERATE_DAY_FEEDING"
            feed_adjustment_pct = -15.0
            actionable_recommendations.append("Disengage redundant daytime aerators to save electricity; prime all automated aerators for midnight auto-boost.")
            actionable_recommendations.append("Monitor pH swing: if pH exceeds 8.6, apply molasses or fermented rice bran to buffer alkalinity.")


        # Condition 4: HOT AFTERNOON HEATWAVE
        # Air temp > 36°C or water temp > 32.5°C with high solar radiation
        elif air_temp >= 35.5 or water_temp >= 32.5:
            condition_key = "HOT_AFTERNOON"
            condition_title = "Severe Midday Thermal Stress & Hypoxia Risk"
            condition_severity = "HIGH" if do_mg_l < 4.5 else "WARNING"
            detected_stressors.append(
                f"Elevated water temperature ({water_temp:.1f}°C) reduces oxygen saturation ceiling to {do_saturation:.2f} mg/L "
                f"while increasing shrimp metabolic basal respiration by ~45%."
            )
            if nh3_toxic >= 0.04:
                detected_stressors.append(f"High water temperature shifts ammonium balance to toxic unionized NH3: {nh3_toxic:.4f} mg/L.")
            
            aeration_instruction = "RUN_MAXIMUM_AERATION"
            feeding_instruction = "CURTAIL_FEED_BY_35_PCT"
            feed_adjustment_pct = -35.0
            actionable_recommendations.append("Run all paddlewheels and spiral aerators to maximize dissolved oxygen dissolution.")
            actionable_recommendations.append("Cut afternoon feed ration by 35% to minimize digestive oxygen demand (Specific Dynamic Action).")
            actionable_recommendations.append("Verify water circulation in check-tray quadrants to prevent localized thermal dead zones.")

        # Condition 5: COLD SNAP / CHILL INFLUX
        # Water temp < 26.5°C or air temp < 22°C
        elif water_temp < 26.0 or air_temp < 22.0:
            condition_key = "COLD_SNAP"
            condition_title = "Sub-Optimal Low Temperature & Gut Sluggishness"
            condition_severity = "WARNING"
            detected_stressors.append(
                f"Chilled pond temperature ({water_temp:.1f}°C < 26.0°C optimal) slows Litopenaeus vannamei enzymatic digestion."
            )
            detected_stressors.append("Extended gut evacuation time increases uneaten pellet degradation and benthic fouling.")
            aeration_instruction = "MAINTAIN_MODERATE_AERATION"
            feeding_instruction = "REDUCE_FEED_BY_30_PCT"
            feed_adjustment_pct = -30.0
            actionable_recommendations.append("Delay morning feeding cycle by 90 minutes until solar radiation warms the surface layer.")
            actionable_recommendations.append("Reduce feed batch by 30% and inspect check trays at 2.5 hours post-feed.")

        # Condition 6: SENSOR-WEATHER CONFLICT DETECTOR
        # E.g. sunny hot weather but sensor reports cold water, or heavy rain but sensor water level dropped
        elif rain_mm > 15.0 and water_level_m < 1.05:
            condition_key = "SENSOR_WEATHER_CONFLICT"
            condition_title = "Telemetry Discrepancy Alert: Water Level vs Rainfall"
            condition_severity = "WARNING"
            detected_stressors.append(
                f"Weather station recorded heavy rain ({rain_mm:.1f} mm), yet ultrasonic water level sensor reports {water_level_m:.2f} m. "
                f"Potential seepage loss, open drain valve, or sensor calibration drift."
            )
            actionable_recommendations.append("Dispatch field scout to inspect pond dike berm and physical gauge stick.")

        # Emergency override: Critical Hypoxia Interlock (Takes precedence over any weather scenario)
        if do_mg_l < 3.2:
            condition_severity = "CRITICAL"
            aeration_instruction = "EMERGENCY_FULL_AERATION_ENGAGED"
            feeding_instruction = "EMERGENCY_FEEDING_LOCKOUT"
            feed_adjustment_pct = -100.0
            detected_stressors.insert(
                0,
                f"EMERGENCY HYPOXIC COLLAPSE: Measured DO ({do_mg_l:.2f} mg/L) is below survival threshold (3.2 mg/L). "
                f"Local edge controller overrides all routines."
            )
            actionable_recommendations.insert(0, "EMERGENCY: Start silent DG auxiliary backup and engage all spare paddlewheels.")

        return {
            "pond_id": pond_id,
            "pond_name": pond_name,
            "analysis_timestamp_utc": now.isoformat(),
            "active_condition": {
                "key": condition_key,
                "title": condition_title,
                "severity": condition_severity,
                "detected_stressors": detected_stressors or ["Parameters within optimal diurnal bounds."]
            },
            "biological_status": {
                "direct_measurements": {
                    "water_temperature_c": water_temp,
                    "dissolved_oxygen_mg_l": do_mg_l,
                    "salinity_ppt": salinity_ppt,
                    "ph": ph,
                    "tan_mg_l": tan_mg_l,
                    "water_level_m": water_level_m
                },
                "calculated_estimates": {
                    "unionized_ammonia_nh3_mg_l": nh3_toxic,
                    "do_saturation_ceiling_mg_l": do_saturation,
                    "do_saturation_percentage": do_saturation_pct,
                    "formula_used": "Emerson/Trussell (NH3) & Benson/Krause (DO Saturation)"
                }
            },
            "atmospheric_context": {
                "air_temperature_c": air_temp,
                "relative_humidity_pct": humidity,
                "rainfall_mm": rain_mm,
                "solar_radiation_wm2": solar_rad,
                "wind_speed_kmh": wind_speed,
                "next_6h_forecast_rain_mm": round(next_6h_rain, 1),
                "weather_provider": weather.provider_name,
                "is_weather_simulated": weather.is_simulated
            },
            "adaptive_recommendations": {
                "aeration_action": aeration_instruction,
                "feeding_action": feeding_instruction,
                "recommended_feed_adjustment_pct": feed_adjustment_pct,
                "actionable_steps": actionable_recommendations,
                "operator_approval_required": True,
                "automation_safety_mode": "SUPERVISED_OPERATOR_APPROVAL"
            }
        }

climate_engine = ClimateAdaptationEngine()
