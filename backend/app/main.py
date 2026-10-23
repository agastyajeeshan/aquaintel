import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from .config import settings
from .database import engine, Base, SessionLocal, get_db
from .models import Pond
from .seed_data import seed_database

# Import routers
from .api.auth import router as auth_router
from .api.farms import router as farms_router
from .api.ponds import router as ponds_router
from .api.sensors import router as sensors_router
from .api.feeding import router as feeding_router
from .api.aeration import router as aeration_router
from .api.disease import router as disease_router
from .api.cv import router as cv_router
from .api.devices import router as devices_router
from .api.alerts import router as alerts_router
from .api.analytics import router as analytics_router
from .api.roi import router as roi_router
from .api.reports import router as reports_router
from .api.settings import router as settings_router
from .api.simulator import router as simulator_router, websocket_telemetry_endpoint
from .api.telemetry import router as telemetry_router
from .api.ai import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AquaIntel Commercial 10-Hectare Smart Prawn Farm Automation & AI-Based Disease Risk Management Platform",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api/v1 and /api for backwards compatibility
api_routers = [
    auth_router,
    farms_router,
    ponds_router,
    sensors_router,
    feeding_router,
    aeration_router,
    disease_router,
    cv_router,
    devices_router,
    alerts_router,
    analytics_router,
    roi_router,
    reports_router,
    settings_router,
    simulator_router,
    telemetry_router,
    ai_router
]

for r in api_routers:
    app.include_router(r, prefix="/api/v1")
    app.include_router(r, prefix="/api")

# Direct WebSocket endpoint on root ws path as well
app.add_api_websocket_route("/ws/telemetry", websocket_telemetry_endpoint)

@app.get("/")
def root():
    return {
        "project": "AQUAINTEL",
        "description": "Smart Prawn Farm Automation & AI-Based Disease Risk Management",
        "farm_scale": "10 Hectare Commercial Farm (Nellore, AP, India)",
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "api_v1": "/api/v1"
    }

@app.get("/health")
@app.get("/api/health")
@app.get("/api/v1/health")
def health(db: Session = Depends(get_db)):
    db_status = "UNKNOWN"
    ponds_count = 0
    try:
        db.execute(text("SELECT 1"))
        ponds_count = db.query(Pond).count()
        db_status = "CONNECTED"
    except Exception as e:
        db_status = f"ERROR: {str(e)}"

    is_healthy = db_status == "CONNECTED"
    return {
        "status": "HEALTHY" if is_healthy else "DEGRADED",
        "service": "AquaIntel Backend API",
        "version": settings.VERSION,
        "database": {
            "status": db_status,
            "dialect": engine.dialect.name,
            "ponds_seeded": ponds_count,
        },
        "system": {
            "demo_mode": settings.DEMO_MODE,
            "farm_total_hectares": settings.FARM_TOTAL_HECTARES,
            "total_ponds": settings.TOTAL_PONDS,
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/ready")
@app.get("/api/ready")
@app.get("/api/v1/ready")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "READY", "database": "CONNECTED"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=f"Database not ready: {str(e)}")

@app.get("/version")
@app.get("/api/version")
@app.get("/api/v1/version")
def version():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "api_versions": ["v1", "legacy_api"]
    }

