import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import User, Farm, Pond, Alert, Aerator, Feeder, IoTDevice, DevicePushToken, AuditLog
from app.core.security import create_access_token
from app.config import settings
from app.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    from app.database import ensure_schema_migrations
    ensure_schema_migrations()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

def test_unauthorized_endpoints_reject_without_token():
    """Verify that protected mutations reject unauthenticated requests with 401 when DEMO_MODE is disabled."""
    original_demo = settings.DEMO_MODE
    try:
        settings.DEMO_MODE = False

        # Alert acknowledge without token
        res_ack = client.post("/api/v1/alerts/1/acknowledge")
        assert res_ack.status_code == 401

        # Alert resolve without token
        res_res = client.post("/api/v1/alerts/1/resolve")
        assert res_res.status_code == 401

        # Push token registration without token
        res_push = client.post("/api/v1/alerts/push-token", json={
            "token": "ExponentPushToken[test-unauth-123]",
            "platform": "android"
        })
        assert res_push.status_code == 401

        # Aerator control without token
        res_aer = client.post("/api/v1/aeration/1/control", json={"action": "START"})
        assert res_aer.status_code == 401

        # Feeder control without token
        res_feed = client.post("/api/v1/feeding/1/control", json={"action": "START", "amount_kg": 5.0})
        assert res_feed.status_code == 401

        # Device command without token
        res_cmd = client.post("/api/v1/devices/ESP32-P01/commands", json={
            "schema_version": "1.0",
            "action": "SET_STATE",
            "target_state": "ON"
        })
        assert res_cmd.status_code == 401

        # Pond creation without token
        res_pond = client.post("/api/v1/ponds", json={
            "pond_number": 999,
            "name": "Unauth Pond"
        })
        assert res_pond.status_code == 401
    finally:
        settings.DEMO_MODE = original_demo

def test_role_based_forbidden_actions():
    """Verify that VIEWER role is blocked with 403 Forbidden from controlling physical equipment or modifying ponds."""
    viewer_token = create_access_token({"sub": "viewer", "role": "VIEWER", "user_id": 4})
    headers = {"Authorization": f"Bearer {viewer_token}"}

    # VIEWER cannot acknowledge alerts
    res_ack = client.post("/api/v1/alerts/1/acknowledge", headers=headers)
    assert res_ack.status_code == 403

    # VIEWER cannot resolve alerts
    res_res = client.post("/api/v1/alerts/1/resolve", headers=headers)
    assert res_res.status_code == 403

    # VIEWER cannot control aerators
    res_aer = client.post("/api/v1/aeration/1/control", json={"action": "START"}, headers=headers)
    assert res_aer.status_code == 403

    # VIEWER cannot control feeders
    res_feed = client.post("/api/v1/feeding/1/control", json={"action": "START", "amount_kg": 5.0}, headers=headers)
    assert res_feed.status_code == 403

    # VIEWER cannot issue device commands
    res_cmd = client.post("/api/v1/devices/ESP32-P01/commands", json={
        "schema_version": "1.0",
        "device_id": "ESP32-P01",
        "action": "SET_STATE",
        "target_state": "ON",
        "reason": "Unauthorized test command"
    }, headers=headers)
    assert res_cmd.status_code == 403

    # VIEWER cannot create ponds
    res_pond = client.post("/api/v1/ponds", json={
        "pond_number": 998,
        "name": "Viewer Pond"
    }, headers=headers)
    assert res_pond.status_code == 403

def test_cross_farm_authorization_boundary():
    """Verify farmers can only access and modify ponds belonging to their authorized farm."""
    db = SessionLocal()
    farm2 = None
    pond_farm2 = None
    try:
        # Create second farm
        farm2 = Farm(
            name="AquaIntel Andhra Second Estate",
            location="Kavali, Andhra Pradesh, India",
            total_area_ha=5.0,
            pond_count=2
        )
        db.add(farm2)
        db.commit()
        db.refresh(farm2)

        # Create pond on second farm
        pond_farm2 = Pond(
            farm_id=farm2.id,
            pond_number=201,
            name="Farm 2 Experimental Pond",
            area_ha=1.0
        )
        db.add(pond_farm2)

        # Create user assigned specifically to Farm 2
        user_farm2 = User(
            username="farm2_manager",
            email="f2_manager@aquaintel.farm",
            hashed_password="hashed_pw_dummy",
            full_name="Farm 2 Manager",
            role="FARM_MANAGER",
            farm_id=farm2.id
        )
        db.add(user_farm2)
        db.commit()
        db.refresh(user_farm2)
        db.refresh(pond_farm2)

        token_farm2 = create_access_token({"sub": "farm2_manager", "role": "FARM_MANAGER", "user_id": user_farm2.id})
        headers_f2 = {"Authorization": f"Bearer {token_farm2}"}

        # Farm 2 manager attempting to view Pond 1 (belongs to Farm 1) receives 403
        res_view = client.get("/api/v1/ponds/1", headers=headers_f2)
        assert res_view.status_code == 403
        assert "Cross-farm access forbidden" in res_view.json()["detail"]

        # Farm 2 manager attempting to modify Pond 1 receives 403
        res_patch = client.patch("/api/v1/ponds/1", json={"notes": "Illegal edit"}, headers=headers_f2)
        assert res_patch.status_code == 403

        # Farm 2 manager listing ponds only sees ponds on Farm 2
        res_list = client.get("/api/v1/ponds", headers=headers_f2)
        assert res_list.status_code == 200
        f2_ponds = res_list.json()
        assert len(f2_ponds) == 1
        assert f2_ponds[0]["id"] == pond_farm2.id

        # Admin with no farm restriction can access both
        admin_token = create_access_token({"sub": "admin", "role": "ADMIN", "user_id": 1})
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        res_admin_p1 = client.get("/api/v1/ponds/1", headers=headers_admin)
        assert res_admin_p1.status_code == 200
        res_admin_p2 = client.get(f"/api/v1/ponds/{pond_farm2.id}", headers=headers_admin)
        assert res_admin_p2.status_code == 200
    finally:
        if pond_farm2 and pond_farm2.id:
            db.query(Pond).filter(Pond.id == pond_farm2.id).delete()
        db.query(User).filter(User.username == "farm2_manager").delete()
        if farm2 and farm2.id:
            db.query(Farm).filter(Farm.id == farm2.id).delete()
        db.commit()
        db.close()

def test_alert_acknowledgement_and_resolution_flow():
    """Verify operator role acknowledges and resolves alert with full audit tracking."""
    operator_token = create_access_token({"sub": "operator", "role": "OPERATOR", "user_id": 3})
    headers = {"Authorization": f"Bearer {operator_token}"}

    # Acknowledge
    res_ack = client.post("/api/v1/alerts/1/acknowledge", headers=headers)
    assert res_ack.status_code == 200
    assert res_ack.json()["new_status"] == "ACKNOWLEDGED"

    # Resolve
    res_res = client.post("/api/v1/alerts/1/resolve", headers=headers)
    assert res_res.status_code == 200
    assert res_res.json()["new_status"] == "RESOLVED"

    # Verify audit log
    db = SessionLocal()
    try:
        ack_log = db.query(AuditLog).filter(
            AuditLog.action == "ALERT_ACKNOWLEDGED",
            AuditLog.resource_id == "1"
        ).order_by(AuditLog.id.desc()).first()
        assert ack_log is not None
        assert ack_log.user_id == 3
        assert ack_log.username == "operator"

        res_log = db.query(AuditLog).filter(
            AuditLog.action == "ALERT_RESOLVED",
            AuditLog.resource_id == "1"
        ).order_by(AuditLog.id.desc()).first()
        assert res_log is not None
        assert res_log.user_id == 3
    finally:
        db.close()

def test_push_token_registration_and_persistence():
    """Verify push token registration persists into database and prevents duplicates."""
    operator_token = create_access_token({"sub": "operator", "role": "OPERATOR", "user_id": 3})
    headers = {"Authorization": f"Bearer {operator_token}"}
    test_token = f"ExponentPushToken[test-{uuid.uuid4().hex[:8]}]"

    # 1. First registration
    res1 = client.post("/api/v1/alerts/push-token", json={
        "token": test_token,
        "platform": "android",
        "device_id": "Pixel_7_Pro_QA"
    }, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["status"] == "SUCCESS"
    assert res1.json()["user_id"] == 3

    # Check database persistence
    db = SessionLocal()
    try:
        token_rec = db.query(DevicePushToken).filter(DevicePushToken.token == test_token).first()
        assert token_rec is not None
        assert token_rec.user_id == 3
        assert token_rec.device_id == "Pixel_7_Pro_QA"
        assert token_rec.platform == "android"
        assert token_rec.is_active is True

        # 2. Re-registration with new device_id updates existing record without duplicates
        res2 = client.post("/api/v1/alerts/push-token", json={
            "token": test_token,
            "platform": "android",
            "device_id": "Pixel_8_Updated"
        }, headers=headers)
        assert res2.status_code == 200

        db.expire_all()
        all_matching = db.query(DevicePushToken).filter(DevicePushToken.token == test_token).all()
        assert len(all_matching) == 1
        assert all_matching[0].device_id == "Pixel_8_Updated"
    finally:
        db.query(DevicePushToken).filter(DevicePushToken.token == test_token).delete()
        db.commit()
        db.close()
