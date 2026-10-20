import os

class Settings:
    PROJECT_NAME: str = "AQUAINTEL - Smart Prawn Farm Automation"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aquaintel-super-secret-key-2026-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: Defaults to local SQLite if DATABASE_URL is not set
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./aquaintel.db"
    )
    
    # 10 Hectare Farm Specifications
    FARM_TOTAL_HECTARES: float = 10.0
    TOTAL_PONDS: int = 10
    POND_SIZE_HA: float = 1.0  # 1 Hectare per pond
    
    # Water Quality Optimal Thresholds (Litopenaeus vannamei)
    THRESHOLDS = {
        "do": {"min": 4.0, "max": 8.5, "optimal_min": 5.0, "optimal_max": 7.5, "unit": "mg/L"},
        "ph": {"min": 7.5, "max": 8.5, "optimal_min": 7.8, "optimal_max": 8.3, "unit": "pH"},
        "temperature": {"min": 26.0, "max": 33.0, "optimal_min": 28.0, "optimal_max": 31.0, "unit": "°C"},
        "salinity": {"min": 10.0, "max": 30.0, "optimal_min": 15.0, "optimal_max": 25.0, "unit": "ppt"},
        "ammonia": {"min": 0.0, "max": 0.1, "optimal_min": 0.0, "optimal_max": 0.05, "unit": "mg/L"},
        "turbidity": {"min": 25.0, "max": 45.0, "optimal_min": 30.0, "optimal_max": 40.0, "unit": "cm (Secchi)"},
        "water_level": {"min": 1.0, "max": 1.6, "optimal_min": 1.2, "optimal_max": 1.4, "unit": "m"},
    }
    
    DEMO_MODE: bool = True
    OFFLINE_SIMULATION: bool = False

settings = Settings()
