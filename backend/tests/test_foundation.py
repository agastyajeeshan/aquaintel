import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import Farm, Pond, Sensor, Aerator, Feeder, IoTDevice, User
from app.seed_data import seed_database

client = TestClient(app)

def test_database_connection():
    """Verify that database engine can connect and execute queries."""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
        assert result == 1

def test_database_tables_and_seed_data():
    """Verify that all core tables exist and are properly populated."""
    # Ensure tables and seed data exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
        
        # Verify Farm
        farm = db.query(Farm).first()
        assert farm is not None
        assert farm.total_area_ha == 10.0
        assert farm.pond_count == 10

        # Verify 10 Ponds
        ponds = db.query(Pond).all()
        assert len(ponds) == 10
        for p in ponds:
            assert p.area_ha == 1.0
            assert "Litopenaeus vannamei" in p.shrimp_species

        # Verify Sensors (7 sensors per pond * 10 ponds = 70 sensors)
        sensor_count = db.query(Sensor).count()
        assert sensor_count >= 70

        # Verify Aerators (4 aerators per pond * 10 ponds = 40 aerators)
        aerator_count = db.query(Aerator).count()
        assert aerator_count >= 40

        # Verify Feeders (1 feeder per pond * 10 ponds = 10 feeders)
        feeder_count = db.query(Feeder).count()
        assert feeder_count >= 10

        # Verify Users
        users = db.query(User).all()
        assert len(users) >= 4
        usernames = {u.username for u in users}
        assert {"admin", "manager", "operator", "viewer"}.issubset(usernames)

        # Verify IoT Devices (10 pond master controllers + central gateway)
        devices_count = db.query(IoTDevice).count()
        assert devices_count >= 11
    finally:
        db.close()

def test_health_check_endpoint():
    """Verify GET /api/health and /health return 200 and healthy status."""
    for path in ["/health", "/api/health"]:
        response = client.get(path)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "HEALTHY"
        assert data["service"] == "AquaIntel Backend API"
        assert "database" in data
        assert data["database"]["status"] == "CONNECTED"
        assert data["database"]["ponds_seeded"] == 10
        assert "system" in data
        assert data["system"]["total_ponds"] == 10

def test_root_endpoint():
    """Verify GET / returns project operational info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "AQUAINTEL"
    assert data["status"] == "OPERATIONAL"

def test_farm_overview_endpoint():
    """Verify GET /api/farms/overview returns 10-pond aggregate KPIs."""
    response = client.get("/api/farms/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["total_ponds"] == 10
    assert "total_biomass_kg" in data
    assert "today_feed_kg" in data
    assert "energy_consumption_kwh" in data
    assert "healthy_ponds" in data

def test_ponds_list_endpoint():
    """Verify GET /api/ponds returns all 10 pond summaries with water quality."""
    response = client.get("/api/ponds")
    assert response.status_code == 200
    ponds = response.json()
    assert len(ponds) == 10
    first_pond = ponds[0]
    assert "pond_number" in first_pond
    assert "water_quality" in first_pond
    assert "do" in first_pond["water_quality"]
    assert "ph" in first_pond["water_quality"]
    assert "temperature" in first_pond["water_quality"]

def test_simulator_status_endpoint():
    """Verify IoT simulator status endpoint."""
    response = client.get("/api/simulator/status")
    assert response.status_code == 200
    data = response.json()
    assert data["total_ponds_monitored"] == 10
    assert "is_offline" in data
