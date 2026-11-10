import pytest
import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import User, DevicePushToken, Alert, AuditLog
from app.core.notification_service import notification_service
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


def get_auth_token(username: str = "operator", password: str = "operator123"):
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, f"Login failed for {username}: {resp.text}"
    return resp.json()["access_token"]


def test_push_token_registration_and_deactivation():
    """Verify push token registration, deduplication, and deactivation upon logout."""
    orig_demo = settings.DEMO_MODE

    # 1. Unauthenticated request blocked when DEMO_MODE is False
    try:
        settings.DEMO_MODE = False
        resp_unauth = client.post("/api/v1/alerts/push-token", json={"token": "ExponentPushToken[unit_test_token_1]"})
        assert resp_unauth.status_code == 401
    finally:
        settings.DEMO_MODE = orig_demo

    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Register valid token
    resp_reg = client.post(
        "/api/v1/alerts/push-token",
        headers=headers,
        json={
            "token": "ExponentPushToken[unit_test_token_1]",
            "platform": "android",
            "device_id": "Pixel_QA_Device"
        }
    )
    assert resp_reg.status_code == 200
    assert resp_reg.json()["status"] == "SUCCESS"

    # Verify in DB
    db = SessionLocal()
    db_token = db.query(DevicePushToken).filter(DevicePushToken.token == "ExponentPushToken[unit_test_token_1]").first()
    assert db_token is not None
    assert db_token.is_active is True
    assert db_token.device_id == "Pixel_QA_Device"
    db.close()

    # 3. Deactivate token via DELETE /push-token
    resp_del = client.request(
        "DELETE",
        "/api/v1/alerts/push-token",
        headers=headers,
        json={"token": "ExponentPushToken[unit_test_token_1]"}
    )
    assert resp_del.status_code == 200
    assert resp_del.json()["status"] == "SUCCESS"

    db = SessionLocal()
    db_token_after = db.query(DevicePushToken).filter(DevicePushToken.token == "ExponentPushToken[unit_test_token_1]").first()
    assert db_token_after.is_active is False
    db.close()


def test_test_push_endpoint():
    """Verify POST /api/v1/alerts/test-push dispatches using notification service."""
    token = get_auth_token("admin", "admin123")
    headers = {"Authorization": f"Bearer {token}"}

    # Register an active push token for admin
    resp_reg = client.post(
        "/api/v1/alerts/push-token",
        headers=headers,
        json={
            "token": "ExponentPushToken[Admin_Test_Device_Token]",
            "platform": "android",
            "device_id": "Admin_Phone"
        }
    )
    assert resp_reg.status_code == 200

    import httpx
    original_post = httpx.Client.post

    def mock_expo_post(self, url, *args, **kwargs):
        if "exp.host" in str(url):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"data": [{"status": "ok", "id": "ticket-test-123"}]}
            return mock_resp
        return original_post(self, url, *args, **kwargs)

    with patch.object(httpx.Client, "post", new=mock_expo_post):
        resp = client.post(
            "/api/v1/alerts/test-push?pond_id=1&severity=CRITICAL",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["channel_id"] == "critical_alerts"
        assert data["sent_count"] >= 1

    # Clean up test token
    client.request("DELETE", "/api/v1/alerts/push-token", headers=headers, json={"token": "ExponentPushToken[Admin_Test_Device_Token]"})


def test_dispatch_channel_mapping_and_device_not_registered_handling():
    """Verify channel mapping and automatic token deactivation when Expo reports DeviceNotRegistered."""
    db = SessionLocal()
    user = db.query(User).filter(User.username == "operator").first()

    # Seed two tokens: one valid, one defunct
    token_ok = DevicePushToken(
        user_id=user.id,
        device_id="Dev_OK",
        token="ExponentPushToken[Valid_Token_123]",
        platform="android",
        is_active=True
    )
    token_defunct = DevicePushToken(
        user_id=user.id,
        device_id="Dev_Defunct",
        token="ExponentPushToken[Defunct_Token_456]",
        platform="android",
        is_active=True
    )
    db.merge(token_ok)
    db.merge(token_defunct)
    db.commit()

    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": [
                {"status": "ok"},
                {"status": "error", "message": "Device not registered", "details": {"error": "DeviceNotRegistered"}}
            ]
        }
        mock_post.return_value = mock_resp

        result = notification_service.dispatch_push_to_devices(
            db=db,
            title="Warning Test",
            body="Ammonia concentration elevated",
            pond_id=1,
            severity="WARNING",
            user_id=user.id
        )

        assert result["channel_id"] == "warnings"
        assert result["sent_count"] == 1
        assert result["errors"] == 1

    # Verify defunct token was deactivated in database
    db.expire_all()
    defunct_in_db = db.query(DevicePushToken).filter(DevicePushToken.token == "ExponentPushToken[Defunct_Token_456]").first()
    assert defunct_in_db.is_active is False

    # Clean up
    db.query(DevicePushToken).filter(
        DevicePushToken.token.in_(["ExponentPushToken[Valid_Token_123]", "ExponentPushToken[Defunct_Token_456]"])
    ).delete(synchronize_session=False)
    db.commit()
    db.close()


def test_critical_telemetry_triggers_push_dispatch():
    """Verify that critical low DO in telemetry ingestion calls create_or_deduplicate_alert and dispatches push."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}

    # Register an active device token so dispatch is invoked
    client.post(
        "/api/v1/alerts/push-token",
        headers=headers,
        json={
            "token": "ExponentPushToken[Critical_Telemetry_Device]",
            "platform": "android",
            "device_id": "Device_QA_Critical"
        }
    )

    with patch.object(notification_service, "dispatch_push_to_devices", wraps=notification_service.dispatch_push_to_devices) as spy_dispatch:
        telemetry_payload = {
            "schema_version": "1.0",
            "message_id": f"msg-crit-{uuid.uuid4().hex[:8]}",
            "device_id": "ESP32-P01",
            "farm_id": "farm-01",
            "pond_id": 1,
            "mode": "SIMULATED",
            "readings": {
                "do_mg_l": 2.1,  # Critical (< 3.0)
                "ph": 7.8,
                "temperature_c": 28.5
            }
        }
        resp = client.post("/api/v1/telemetry", json=telemetry_payload)
        assert resp.status_code == 201

        # Verify dispatch_push_to_devices was called for the critical alert
        assert spy_dispatch.called
        call_kwargs = spy_dispatch.call_args[1]
        assert call_kwargs["severity"] == "CRITICAL"
        assert call_kwargs["pond_id"] == 1
        assert "Critical Low DO" in call_kwargs["title"]

    # Clean up
    client.request("DELETE", "/api/v1/alerts/push-token", headers=headers, json={"token": "ExponentPushToken[Critical_Telemetry_Device]"})
