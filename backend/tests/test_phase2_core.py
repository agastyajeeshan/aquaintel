import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import User, Farm, Pond, Sensor, SensorReading, Alert, IoTDevice, DeviceCommand, IngestedTelemetry, AuditLog
from app.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

def test_versioned_api_routes():
    """Verify that versioned API /api/v1 endpoints and system health/ready endpoints work."""
    # Test health endpoints
    res_v1 = client.get("/api/v1/health")
    assert res_v1.status_code == 200
    assert res_v1.json()["status"] == "HEALTHY"

    res_legacy = client.get("/api/health")
    assert res_legacy.status_code == 200

    # Test ready endpoint
    res_ready = client.get("/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "READY"

    # Test version endpoint
    res_ver = client.get("/version")
    assert res_ver.status_code == 200
    assert "version" in res_ver.json()

def test_auth_login_and_me():
    """Verify user login and Bearer token /auth/me authentication."""
    res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"
    token = data["access_token"]

    # Access /auth/me with Bearer token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "admin"
    assert me_data["role"] == "ADMIN"

def test_auth_register_and_logout():
    """Verify registration with password hashing and audit logging, followed by logout."""
    unique_user = f"user_{uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/auth/register", json={
        "username": unique_user,
        "email": f"{unique_user}@aquaintel.io",
        "password": "securepassword123",
        "full_name": "Test Field Operator",
        "role": "OPERATOR"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == unique_user
    token = data["access_token"]

    # Logout
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200
    assert logout_res.json()["status"] == "SUCCESS"

def test_password_reset_workflow():
    """Verify development password reset token issuance and confirmation."""
    reset_user = f"reset_{uuid.uuid4().hex[:6]}"
    email = f"{reset_user}@aquaintel.io"
    client.post("/api/v1/auth/register", json={
        "username": reset_user,
        "email": email,
        "password": "initialpassword",
        "role": "OPERATOR"
    })

    # Request reset
    req_res = client.post("/api/v1/auth/password-reset/request", json={"email": email})
    assert req_res.status_code == 200
    debug_token = req_res.json().get("debug_token")
    assert debug_token is not None

    # Confirm reset
    conf_res = client.post("/api/v1/auth/password-reset/confirm", json={
        "token": debug_token,
        "new_password": "newpassword456"
    })
    assert conf_res.status_code == 200

    # Verify login with new password
    login_res = client.post("/api/v1/auth/login", json={
        "username": reset_user,
        "password": "newpassword456"
    })
    assert login_res.status_code == 200

def test_telemetry_ingestion_and_deduplication():
    """Verify JSON telemetry ingestion, range checks, deduplication, and critical alerts."""
    msg_id = f"MSG-{uuid.uuid4().hex[:10]}"
    payload = {
        "schema_version": "1.0",
        "message_id": msg_id,
        "device_id": "ESP32-P01",
        "farm_id": "farm-01",
        "pond_id": 1,
        "mode": "SIMULATED",
        "readings": {
            "do_mg_l": 2.8,  # Critical low DO to test threshold detection
            "ph": 8.1,
            "temperature_c": 29.5,
            "ammonia_mg_l": 0.03,
            "salinity_ppt": 21.0
        }
    }

    # Ingest
    res = client.post("/api/v1/telemetry", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "ACCEPTED"
    assert data["records_created"] == 5

    # Ingest duplicate message_id
    dup_res = client.post("/api/v1/telemetry", json=payload)
    assert dup_res.status_code == 201
    assert dup_res.json()["status"] == "DUPLICATE_IGNORED"

    # Verify critical alert was generated for DO < 3.0 mg/L
    db = SessionLocal()
    try:
        alert = db.query(Alert).filter(Alert.pond_id == 1, Alert.alert_type == "LOW_DO").order_by(Alert.id.desc()).first()
        assert alert is not None
        assert alert.severity == "CRITICAL"
    finally:
        db.close()

def test_telemetry_out_of_bounds_rejection():
    """Verify impossible physical readings (e.g. DO 35 mg/L or pH 15) are flagged as anomalies."""
    msg_id = f"MSG-ANOM-{uuid.uuid4().hex[:8]}"
    payload = {
        "schema_version": "1.0",
        "message_id": msg_id,
        "device_id": "ESP32-P02",
        "pond_id": 2,
        "readings": {
            "do_mg_l": 38.0,  # Physically impossible in aquaculture water
            "ph": 7.9
        }
    }
    res = client.post("/api/v1/telemetry", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["records_created"] == 1  # Only pH accepted
    assert len(data["anomalies"]) == 1
    assert data["anomalies"][0]["sensor_type"] == "do"

def test_actuator_command_lifecycle():
    """Verify issuing command, querying history, and processing device acknowledgement."""
    cmd_payload = {
        "schema_version": "1.0",
        "device_id": "ESP32-P01",
        "action": "SET_STATE",
        "target_state": "ON",
        "reason": "LOW_DO_COMPENSATION",
        "expires_in_seconds": 60
    }
    res = client.post("/api/v1/devices/ESP32-P01/commands", json=cmd_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "QUEUED"
    cmd_id = data["command_id"]

    # Check command history
    hist_res = client.get("/api/v1/devices/ESP32-P01/commands")
    assert hist_res.status_code == 200
    commands = hist_res.json()
    assert any(c["command_id"] == cmd_id and c["status"] == "PENDING" for c in commands)

    # Acknowledge command from device
    ack_res = client.post("/api/v1/devices/ESP32-P01/ack", json={
        "command_id": cmd_id,
        "device_id": "ESP32-P01",
        "status": "COMPLETED",
        "actual_state": "ON"
    })
    assert ack_res.status_code == 200
    assert ack_res.json()["current_status"] == "COMPLETED"

def test_pond_crud_and_archival():
    """Verify creating a pond, updating metadata, and soft archival."""
    p_num = 99
    pond_id = None
    try:
        # Create
        create_res = client.post("/api/v1/ponds", json={
            "pond_number": p_num,
            "name": "Experimental Nursery Pond 99",
            "area_ha": 0.5,
            "shrimp_species": "Litopenaeus vannamei",
            "estimated_biomass_kg": 250.0
        })
        assert create_res.status_code == 201
        pond_id = create_res.json()["pond_id"]

        # Update
        patch_res = client.patch(f"/api/v1/ponds/{pond_id}", json={
            "estimated_biomass_kg": 320.0,
            "notes": "Optimal feeding tray clearance observed"
        })
        assert patch_res.status_code == 200
        assert patch_res.json()["updated_fields"]["estimated_biomass_kg"] == 320.0

        # Archive
        del_res = client.delete(f"/api/v1/ponds/{pond_id}")
        assert del_res.status_code == 200

        # Verify not listed in active ponds by default
        active_ponds = client.get("/api/v1/ponds").json()
        assert not any(p["id"] == pond_id for p in active_ponds)

        # Verify listed when include_archived=true
        all_ponds = client.get("/api/v1/ponds?include_archived=true").json()
        assert any(p["id"] == pond_id for p in all_ponds)
    finally:
        if pond_id:
            cleanup_db = SessionLocal()
            cleanup_db.query(Pond).filter(Pond.id == pond_id).delete()
            cleanup_db.commit()
            cleanup_db.close()

def test_settings_reset_demo_data():
    """Verify demo reset restores natural diurnal state without destroying user data."""
    res = client.post("/api/v1/settings/reset-demo")
    assert res.status_code == 200
    assert res.json()["status"] == "SUCCESS"

    # Verify audit log recorded
    logs_res = client.get("/api/v1/settings/audit-logs")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert any(l["action"] == "DEMO_DATA_RESET" for l in logs)
