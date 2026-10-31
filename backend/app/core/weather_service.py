"""
AquaIntel — Weather Intelligence Provider & Service
Collects, validates, caches, and provides weather observations and forecasts.
Configurable provider pattern supporting Open-Meteo (real-time free API with zero key requirement),
custom providers, and a high-fidelity aquaculture climate simulator fallback.
"""

import os
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import requests

logger = logging.getLogger("aquaintel.weather")

class WeatherData:
    def __init__(
        self,
        air_temperature_c: float,
        relative_humidity_pct: float,
        rainfall_mm: float,
        rainfall_probability_pct: float,
        wind_speed_kmh: float,
        wind_direction_deg: float,
        cloud_cover_pct: float,
        solar_radiation_wm2: float,
        atmospheric_pressure_hpa: float,
        weather_code: int,
        weather_description: str,
        timestamp_utc: str,
        provider_name: str,
        is_simulated: bool = False,
        data_freshness_seconds: int = 0
    ):
        self.air_temperature_c = air_temperature_c
        self.relative_humidity_pct = relative_humidity_pct
        self.rainfall_mm = rainfall_mm
        self.rainfall_probability_pct = rainfall_probability_pct
        self.wind_speed_kmh = wind_speed_kmh
        self.wind_direction_deg = wind_direction_deg
        self.cloud_cover_pct = cloud_cover_pct
        self.solar_radiation_wm2 = solar_radiation_wm2
        self.atmospheric_pressure_hpa = atmospheric_pressure_hpa
        self.weather_code = weather_code
        self.weather_description = weather_description
        self.timestamp_utc = timestamp_utc
        self.provider_name = provider_name
        self.is_simulated = is_simulated
        self.data_freshness_seconds = data_freshness_seconds

    def to_dict(self) -> Dict[str, Any]:
        return {
            "air_temperature_c": round(self.air_temperature_c, 1),
            "relative_humidity_pct": round(self.relative_humidity_pct, 1),
            "rainfall_mm": round(self.rainfall_mm, 2),
            "rainfall_probability_pct": round(self.rainfall_probability_pct, 1),
            "wind_speed_kmh": round(self.wind_speed_kmh, 1),
            "wind_direction_deg": round(self.wind_direction_deg, 1),
            "cloud_cover_pct": round(self.cloud_cover_pct, 1),
            "solar_radiation_wm2": round(self.solar_radiation_wm2, 1),
            "atmospheric_pressure_hpa": round(self.atmospheric_pressure_hpa, 1),
            "weather_code": self.weather_code,
            "weather_description": self.weather_description,
            "timestamp_utc": self.timestamp_utc,
            "provider_name": self.provider_name,
            "is_simulated": self.is_simulated,
            "data_freshness_seconds": self.data_freshness_seconds
        }


class WeatherService:
    """
    Central weather service handling caching, provider fallbacks, and forecast aggregation
    for the Nellore, Andhra Pradesh aquaculture farm coordinate: (14.4426° N, 79.9865° E).
    """

    DEFAULT_LATITUDE = 14.4426
    DEFAULT_LONGITUDE = 79.9865
    CACHE_TTL_SECONDS = 900  # 15 minutes

    def __init__(self, latitude: float = DEFAULT_LATITUDE, longitude: float = DEFAULT_LONGITUDE):
        self.latitude = latitude
        self.longitude = longitude
        self.provider_type = os.getenv("WEATHER_PROVIDER", "open_meteo")
        
        # In-memory cache
        self._current_cache: Optional[WeatherData] = None
        self._current_cache_time: float = 0.0
        
        self._forecast_cache: Optional[Dict[str, Any]] = None
        self._forecast_cache_time: float = 0.0
        
        # Override fixture for testing specific climate scenarios
        self._active_climate_scenario: Optional[str] = None
        self._scenario_override_data: Optional[Dict[str, Any]] = None

    def set_scenario_override(self, scenario_name: Optional[str], custom_data: Optional[Dict[str, Any]] = None):
        """Allows injecting synthetic edge-case scenarios (Summer+Rain, Heatwave, API Failure)."""
        self._active_climate_scenario = scenario_name
        self._scenario_override_data = custom_data
        # Invalidate cache
        self._current_cache = None
        self._current_cache_time = 0.0

    def get_current_weather(self, force_refresh: bool = False) -> WeatherData:
        now = time.time()
        
        # Check active scenario override first
        if self._active_climate_scenario:
            return self._build_scenario_weather(self._active_climate_scenario, self._scenario_override_data)

        # Return cached if valid
        if not force_refresh and self._current_cache and (now - self._current_cache_time < self.CACHE_TTL_SECONDS):
            self._current_cache.data_freshness_seconds = int(now - self._current_cache_time)
            return self._current_cache

        # Attempt fetching from configured provider
        if self.provider_type == "open_meteo":
            try:
                weather = self._fetch_open_meteo()
                self._current_cache = weather
                self._current_cache_time = now
                return weather
            except Exception as e:
                logger.warning(f"Open-Meteo API error: {str(e)}. Falling back to local empirical model.")

        # Fallback to empirical diurnal aquaculture climate simulation
        weather = self._generate_empirical_weather()
        self._current_cache = weather
        self._current_cache_time = now
        return weather

    def get_weather_forecast(self, horizons_hours: int = 72) -> Dict[str, Any]:
        """Provides hourly weather forecast timeline for 24h, 72h, or 7 days."""
        now = time.time()
        if self._forecast_cache and (now - self._forecast_cache_time < self.CACHE_TTL_SECONDS) and not self._active_climate_scenario:
            return self._forecast_cache

        timeline = []
        current = self.get_current_weather()
        base_time = datetime.now(timezone.utc)

        # Check for scenario-based forecast projections
        scenario = self._active_climate_scenario

        for h in range(1, horizons_hours + 1):
            future_time = base_time + timedelta(hours=h)
            hour_of_day = future_time.hour
            
            # Solar sinusoidal cycle
            solar_factor = max(0.0, -1.0 * (hour_of_day - 6) * (hour_of_day - 18) / 36.0) if 6 <= hour_of_day <= 18 else 0.0
            
            # Base diurnal variations for coastal Nellore
            temp = 26.0 + (solar_factor * 8.5) + (1.2 if hour_of_day in [13, 14, 15] else 0.0)
            humidity = 88.0 - (solar_factor * 35.0)
            solar_rad = solar_factor * 850.0
            rain_mm = 0.0
            rain_prob = 10.0

            # Dynamic scenario modifications
            if scenario == "SUMMER_RAIN":
                # High heat in first 3 hours, sudden heavy rain storm at hours 4-8
                if 4 <= h <= 8:
                    rain_mm = 14.5 if h in [5, 6] else 6.0
                    rain_prob = 95.0
                    temp = 25.2  # rapid atmospheric cooling
                    humidity = 96.0
                    solar_rad = 80.0
                elif h < 4:
                    temp = 36.5
                    solar_rad = 920.0
            elif scenario == "RAINY_SUNSHINE":
                # Rain event passed, strong sunshine has broken through
                rain_mm = 0.0
                rain_prob = 15.0
                solar_rad = 880.0 if 8 <= hour_of_day <= 16 else 0.0
                temp = 33.5 if 10 <= hour_of_day <= 16 else 28.0
                humidity = 78.0  # hot and steamy

            elif scenario == "HEAVY_RAIN":
                # Sustained heavy rainfall
                rain_mm = 18.0 if h <= 12 else 5.0
                rain_prob = 98.0
                temp = 24.5
                humidity = 98.0
                solar_rad = 40.0
            elif scenario == "HOT_AFTERNOON":
                # Severe heatwave
                temp = 37.8 if 11 <= hour_of_day <= 16 else 30.0
                solar_rad = 950.0 if 10 <= hour_of_day <= 15 else 0.0
                humidity = 55.0
            elif scenario == "COLD_SNAP":
                temp = 21.0 if hour_of_day in [2, 3, 4, 5, 6] else 24.5
                humidity = 60.0

            timeline.append({
                "timestamp_utc": future_time.isoformat(),
                "hour_offset": h,
                "air_temperature_c": round(temp, 1),
                "relative_humidity_pct": round(humidity, 1),
                "rainfall_mm": round(rain_mm, 2),
                "rainfall_probability_pct": round(rain_prob, 1),
                "solar_radiation_wm2": round(solar_rad, 1),
                "cloud_cover_pct": 90.0 if rain_mm > 0 else (15.0 if solar_factor > 0.6 else 40.0),
                "wind_speed_kmh": 16.5 if rain_mm > 0 else 8.5
            })

        forecast_res = {
            "farm_coordinates": {"latitude": self.latitude, "longitude": self.longitude, "location": "Nellore, AP, India"},
            "forecast_generated_at": base_time.isoformat(),
            "provider": self.provider_type if not scenario else f"SCENARIO_SIMULATION ({scenario})",
            "horizons_hours": horizons_hours,
            "timeline": timeline
        }
        
        self._forecast_cache = forecast_res
        self._forecast_cache_time = now
        return forecast_res

    def _fetch_open_meteo(self) -> WeatherData:
        """Fetches live meteorological telemetry from Open-Meteo free API."""
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "current": "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m",
            "timezone": "UTC"
        }
        
        resp = requests.get(url, params=params, timeout=4.0)
        resp.raise_for_status()
        data = resp.json()
        
        current = data.get("current", {})
        code = current.get("weather_code", 0)
        desc = self._decode_wmo_code(code)
        
        # Compute solar radiation estimate based on time of day and cloud cover
        utc_now = datetime.now(timezone.utc)
        ist_hour = (utc_now.hour + 5 + (1 if utc_now.minute >= 30 else 0)) % 24
        cloud = current.get("cloud_cover", 20.0)
        
        solar_factor = max(0.0, -1.0 * (ist_hour - 6) * (ist_hour - 18) / 36.0) if 6 <= ist_hour <= 18 else 0.0
        solar_rad = round(solar_factor * 900.0 * (1.0 - (cloud / 150.0)), 1)
        
        return WeatherData(
            air_temperature_c=current.get("temperature_2m", 30.5),
            relative_humidity_pct=current.get("relative_humidity_2m", 72.0),
            rainfall_mm=current.get("rain", 0.0) or current.get("precipitation", 0.0),
            rainfall_probability_pct=90.0 if current.get("rain", 0.0) > 0 else 15.0,
            wind_speed_kmh=current.get("wind_speed_10m", 12.0),
            wind_direction_deg=current.get("wind_direction_10m", 135.0),
            cloud_cover_pct=cloud,
            solar_radiation_wm2=max(0.0, solar_rad),
            atmospheric_pressure_hpa=current.get("surface_pressure", 1008.0),
            weather_code=code,
            weather_description=desc,
            timestamp_utc=current.get("time", utc_now.isoformat()),
            provider_name="Open-Meteo Meteorological Service",
            is_simulated=False,
            data_freshness_seconds=0
        )

    def _generate_empirical_weather(self) -> WeatherData:
        """Deterministic coastal Andhra Pradesh diurnal simulation fallback."""
        now = datetime.now(timezone.utc)
        hour = (now.hour + 5) % 24  # IST approximate
        
        # Solar radiation model
        solar_factor = max(0.0, -1.0 * (hour - 6) * (hour - 18) / 36.0) if 6 <= hour <= 18 else 0.0
        air_temp = 26.5 + (solar_factor * 8.0)
        humidity = 86.0 - (solar_factor * 28.0)
        solar_rad = round(solar_factor * 850.0, 1)

        return WeatherData(
            air_temperature_c=round(air_temp, 1),
            relative_humidity_pct=round(humidity, 1),
            rainfall_mm=0.0,
            rainfall_probability_pct=15.0,
            wind_speed_kmh=11.5,
            wind_direction_deg=140.0,
            cloud_cover_pct=25.0,
            solar_radiation_wm2=solar_rad,
            atmospheric_pressure_hpa=1010.5,
            weather_code=1,
            weather_description="Mainly Clear / Coastal Marine Air",
            timestamp_utc=now.isoformat(),
            provider_name="AquaIntel Coastal Nellore Climate Baseline",
            is_simulated=True,
            data_freshness_seconds=0
        )

    def _build_scenario_weather(self, scenario: str, custom: Optional[Dict[str, Any]]) -> WeatherData:
        now = datetime.now(timezone.utc)
        override = custom or {}

        defaults = {
            "SUMMER_RAIN": {
                "air_temperature_c": 32.5,
                "relative_humidity_pct": 92.0,
                "rainfall_mm": 12.0,
                "rainfall_probability_pct": 95.0,
                "wind_speed_kmh": 26.0,
                "cloud_cover_pct": 95.0,
                "solar_radiation_wm2": 110.0,
                "weather_code": 63,
                "weather_description": "Unexpected Severe Summer Rainstorm & Gusts"
            },
            "RAINY_SUNSHINE": {
                "air_temperature_c": 33.8,
                "relative_humidity_pct": 78.0,
                "rainfall_mm": 0.0,
                "rainfall_probability_pct": 20.0,
                "wind_speed_kmh": 9.0,
                "cloud_cover_pct": 15.0,
                "solar_radiation_wm2": 920.0,
                "weather_code": 2,
                "weather_description": "Post-Monsoon Intense Solar Flare"
            },

            "HEAVY_RAIN": {
                "air_temperature_c": 24.0,
                "relative_humidity_pct": 98.0,
                "rainfall_mm": 35.0,
                "rainfall_probability_pct": 99.0,
                "wind_speed_kmh": 32.0,
                "cloud_cover_pct": 100.0,
                "solar_radiation_wm2": 30.0,
                "weather_code": 65,
                "weather_description": "Heavy Tropical Downpour & Runoff Hazard"
            },
            "HOT_AFTERNOON": {
                "air_temperature_c": 38.2,
                "relative_humidity_pct": 52.0,
                "rainfall_mm": 0.0,
                "rainfall_probability_pct": 5.0,
                "wind_speed_kmh": 6.5,
                "cloud_cover_pct": 5.0,
                "solar_radiation_wm2": 960.0,
                "weather_code": 0,
                "weather_description": "Severe Midday Heatwave Conditions"
            },
            "COLD_SNAP": {
                "air_temperature_c": 20.5,
                "relative_humidity_pct": 65.0,
                "rainfall_mm": 0.0,
                "rainfall_probability_pct": 5.0,
                "wind_speed_kmh": 14.0,
                "cloud_cover_pct": 30.0,
                "solar_radiation_wm2": 450.0,
                "weather_code": 1,
                "weather_description": "Unusually Chilled Winter Air Influx"
            }
        }

        cfg = defaults.get(scenario, defaults["SUMMER_RAIN"])
        cfg.update(override)

        return WeatherData(
            air_temperature_c=cfg["air_temperature_c"],
            relative_humidity_pct=cfg["relative_humidity_pct"],
            rainfall_mm=cfg["rainfall_mm"],
            rainfall_probability_pct=cfg["rainfall_probability_pct"],
            wind_speed_kmh=cfg["wind_speed_kmh"],
            wind_direction_deg=cfg.get("wind_direction_deg", 180.0),
            cloud_cover_pct=cfg["cloud_cover_pct"],
            solar_radiation_wm2=cfg["solar_radiation_wm2"],
            atmospheric_pressure_hpa=cfg.get("atmospheric_pressure_hpa", 1006.0),
            weather_code=cfg["weather_code"],
            weather_description=cfg["weather_description"],
            timestamp_utc=now.isoformat(),
            provider_name=f"SCENARIO_INJECTOR ({scenario})",
            is_simulated=True,
            data_freshness_seconds=0
        )

    def _decode_wmo_code(self, code: int) -> str:
        mapping = {
            0: "Clear Sky",
            1: "Mainly Clear",
            2: "Partly Cloudy",
            3: "Overcast",
            45: "Foggy",
            51: "Light Drizzle",
            53: "Moderate Drizzle",
            61: "Slight Rain",
            63: "Moderate Rain",
            65: "Heavy Torrential Rain",
            80: "Rain Showers",
            95: "Thunderstorm"
        }
        return mapping.get(code, "Variable Weather")


weather_service = WeatherService()
