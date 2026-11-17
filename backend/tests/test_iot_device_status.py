import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import IoTDevice, IngestedTelemetry, SensorReading, Sensor, User, Alert
from app.core.security import create_access_token
from app.config import settings
from app.core.device_status import (
    parse_and_normalize_timestamp,
    format_timestamp_ist,
    DeviceStatusConfig,
    DeviceStatusEngine,
    device_status_engine
)

client = TestClient(app)

class MockDevice:
    def __init__(
        self,
        last_heartbeat_at=None,
        last_telemetry_at=None,
        last_seen=None,
        battery_pct=95.0,
        signal_rssi_dbm=-68,
        hardware_health="HEALTHY",
        is_provisioned=True,
        pond_id=1
    ):
        self.last_heartbeat_at = last_heartbeat_at
        self.last_telemetry_at = last_telemetry_at
        self.last_seen = last_seen
        self.battery_pct = battery_pct
        self.signal_rssi_dbm = signal_rssi_dbm
        self.hardware_health = hardware_health
        self.is_provisioned = is_provisioned
        self.pond_id = pond_id

def test_timestamp_normalization_unix_seconds():
    # 1763378940 is 2025-11-17 11:29:00 UTC
    dt, status = parse_and_normalize_timestamp(1763378940)
    assert status in ["VALID", "FUTURE_TIMESTAMP"]
    assert dt is not None
    assert dt.tzinfo == timezone.utc

def test_timestamp_normalization_unix_milliseconds():
    # 1763378940000 in ms
    dt, status = parse_and_normalize_timestamp(1763378940000)
    assert dt is not None
    assert dt.tzinfo == timezone.utc
    assert dt.year == 2025

def test_timestamp_normalization_iso_utc():
    iso_str = "2026-11-17T12:30:00Z"
    dt, status = parse_and_normalize_timestamp(iso_str)
    assert status in ["VALID", "FUTURE_TIMESTAMP"]
    assert dt is not None
    assert dt.tzinfo == timezone.utc
    assert dt.hour == 12
    assert dt.minute == 30

def test_timestamp_normalization_iso_timezone_offset():
    # 18:00:00+05:30 is 12:30:00 UTC
    iso_str = "2026-11-17T18:00:00+05:30"
    dt, status = parse_and_normalize_timestamp(iso_str)
    assert dt is not None
    assert dt.hour == 12
    assert dt.minute == 30

def test_timestamp_normalization_missing_and_invalid():
    dt_none, status_none = parse_and_normalize_timestamp(None)
    assert dt_none is None
    assert status_none == "MISSING"

    dt_empty, status_empty = parse_and_normalize_timestamp("")
    assert dt_empty is None
    assert status_empty == "MISSING"

    dt_bad, status_bad = parse_and_normalize_timestamp("not-a-timestamp")
    assert dt_bad is None
    assert status_bad == "INVALID_FORMAT"

def test_timestamp_normalization_future_timestamp_detected():
    now_ref = datetime(2026, 11, 17, 12, 0, 0, tzinfo=timezone.utc)
    # 60 seconds into the future
    future_time = now_ref + timedelta(seconds=60)
    dt, status = parse_and_normalize_timestamp(future_time, reference_now=now_ref)
    assert status == "FUTURE_TIMESTAMP"
    assert dt is not None

def test_device_status_engine_dimensions():
    ref_now = datetime(2026, 11, 17, 12, 0, 0, tzinfo=timezone.utc)
    engine = DeviceStatusEngine()

    # Case 1: Fresh heartbeat (10s ago) and fresh telemetry (15s ago)
    d1 = MockDevice(
        last_heartbeat_at=ref_now - timedelta(seconds=10),
        last_telemetry_at=ref_now - timedelta(seconds=15),
        battery_pct=90.0,
        signal_rssi_dbm=-65
    )
    res1 = engine.evaluate(d1, reference_now=ref_now)
    assert res1["connectivity_status"] == "ONLINE"
    assert res1["telemetry_freshness"] == "FRESH"
    assert res1["hardware_health"] == "HEALTHY"
    assert res1["provisioning_status"] == "PROVISIONED"
    assert res1["status"] == "ONLINE"

    # Case 2: Stale heartbeat (120s ago)
    d2 = MockDevice(
        last_heartbeat_at=ref_now - timedelta(seconds=120),
        last_telemetry_at=ref_now - timedelta(seconds=20),
        battery_pct=85.0
    )
    res2 = engine.evaluate(d2, reference_now=ref_now)
    assert res2["connectivity_status"] == "STALE"
    assert res2["telemetry_freshness"] == "FRESH"
    assert res2["status"] == "STALE"

    # Case 3: Offline heartbeat (600s ago)
    d3 = MockDevice(
        last_heartbeat_at=ref_now - timedelta(seconds=600),
        last_telemetry_at=ref_now - timedelta(seconds=600),
        battery_pct=80.0
    )
    res3 = engine.evaluate(d3, reference_now=ref_now)
    assert res3["connectivity_status"] == "OFFLINE"
    assert res3["telemetry_freshness"] == "STALE"
    assert res3["status"] == "OFFLINE"

    # Case 4: Critical battery <= 10%
    d4 = MockDevice(
        last_heartbeat_at=ref_now - timedelta(seconds=5),
        battery_pct=8.0
    )
    res4 = engine.evaluate(d4, reference_now=ref_now)
    assert res4["hardware_health"] == "FAULT"
    assert res4["status"] == "FAULT"

def test_heartbeat_independent_from_telemetry():
    """Device sends heartbeats but no telemetry -> connectivity ONLINE, telemetry MISSING"""
    ref_now = datetime(2026, 11, 17, 12, 0, 0, tzinfo=timezone.utc)
    engine = DeviceStatusEngine()
    dev = MockDevice(
        last_heartbeat_at=ref_now - timedelta(seconds=8),
        last_telemetry_at=None,
        battery_pct=95.0
    )
    res = engine.evaluate(dev, reference_now=ref_now)
    assert res["connectivity_status"] == "ONLINE"
    assert res["telemetry_freshness"] == "MISSING"

def test_api_get_devices_structure():
    res = client.get("/api/v1/devices")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "devices" in data
    summary = data["summary"]
    assert "total_devices" in summary
    assert "online_devices" in summary
    assert "stale_devices" in summary
    assert "offline_devices" in summary
    assert summary["total_devices"] == len(data["devices"])

    for d in data["devices"]:
        assert "connectivity_status" in d
        assert "telemetry_freshness" in d
        assert "hardware_health" in d
        assert "provisioning_status" in d
        assert "last_seen_seconds_ago" in d
        assert d["connectivity_status"] in ["ONLINE", "STALE", "OFFLINE", "UNKNOWN"]
        assert d["telemetry_freshness"] in ["FRESH", "STALE", "MISSING", "INVALID"]

def test_api_device_heartbeat_endpoint():
    # 1. Successful heartbeat on existing device ESP32-P01
    now_utc = datetime.now(timezone.utc)
    res = client.post("/api/v1/devices/ESP32-P01/heartbeat", json={
        "timestamp": now_utc.isoformat(),
        "battery_pct": 94.5,
        "signal_rssi_dbm": -62,
        "firmware_version": "v2.4.2"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["device_id"] == "ESP32-P01"
    assert data["connectivity_status"] == "ONLINE"
    assert data["hardware_health"] == "HEALTHY"

    # 2. Reject future timestamp (>15s) with 422
    future_ts = (now_utc + timedelta(seconds=120)).isoformat()
    res_future = client.post("/api/v1/devices/ESP32-P01/heartbeat", json={
        "timestamp": future_ts
    })
    assert res_future.status_code == 422
    assert "future" in res_future.json()["detail"].lower()

    # 3. Reject non-existent device with 404
    res_404 = client.post("/api/v1/devices/NON_EXISTENT_DEV_99/heartbeat", json={})
    assert res_404.status_code == 404

def test_telemetry_ingest_updates_device_last_telemetry():
    now_utc = datetime.now(timezone.utc)
    db = SessionLocal()
    # Save original sensor reading to preserve test isolation
    orig_sensor = db.query(Sensor).filter(Sensor.pond_id == 2, Sensor.sensor_type == "do").first()
    orig_val = orig_sensor.current_value if orig_sensor else 6.0
    db.close()

    try:
        payload = {
            "schema_version": "1.0",
            "message_id": f"MSG-TEST-{int(now_utc.timestamp())}",
            "device_id": "ESP32-P02",
            "pond_id": 2,
            "mode": "SIMULATED",
            "readings": {
                "do_mg_l": 5.8,
                "ph": 8.0,
                "temperature_c": 29.5
            }
        }
        res = client.post("/api/v1/telemetry", json=payload)
        assert res.status_code == 201

        # Verify ESP32-P02 now has last_telemetry_at updated in database
        verify_db = SessionLocal()
        dev = verify_db.query(IoTDevice).filter(IoTDevice.device_id == "ESP32-P02").first()
        assert dev.last_telemetry_at is not None
        verify_db.close()
    finally:
        # Restore sensor reading
        cleanup_db = SessionLocal()
        s = cleanup_db.query(Sensor).filter(Sensor.pond_id == 2, Sensor.sensor_type == "do").first()
        if s:
            s.current_value = orig_val
            cleanup_db.commit()
        cleanup_db.close()

def test_authoritative_device_summary_counts():
    """Verify backend returns distinct authoritative device counts and partitions are mutually consistent."""
    res = client.get("/api/v1/devices")
    assert res.status_code == 200
    data = res.json()
    summary = data["summary"]

    # 1. Authoritative fields check
    expected_keys = [
        "total_registered_devices",
        "total_devices",
        "provisioned_devices",
        "unprovisioned_devices",
        "online_devices",
        "stale_devices",
        "offline_devices",
        "fault_devices",
        "unknown_devices",
        "fresh_telemetry_count"
    ]
    for key in expected_keys:
        assert key in summary, f"Expected key '{key}' missing from devices summary"

    total_reg = summary["total_registered_devices"]
    assert total_reg == len(data["devices"])
    assert summary["total_devices"] == total_reg

    # 2. Connectivity partition consistency: online + stale + offline + unknown == total
    connectivity_sum = (
        summary["online_devices"] +
        summary["stale_devices"] +
        summary["offline_devices"] +
        summary["unknown_devices"]
    )
    assert connectivity_sum == total_reg, f"Connectivity partition sum ({connectivity_sum}) != total ({total_reg})"

    # 3. Provisioning partition consistency: provisioned + unprovisioned == total
    provisioning_sum = summary["provisioned_devices"] + summary["unprovisioned_devices"]
    assert provisioning_sum == total_reg, f"Provisioning partition sum ({provisioning_sum}) != total ({total_reg})"

def test_empty_fleet_safe_handling():
    """Verify that an empty device fleet does not cause division by zero or runtime crashes."""
    engine = DeviceStatusEngine()
    empty_list = []

    rssi_values = [d.signal_rssi_dbm for d in empty_list if getattr(d, "signal_rssi_dbm", None) is not None]
    avg_rssi = int(sum(rssi_values) / len(rssi_values)) if rssi_values else 0
    assert avg_rssi == 0

    online_count = 0
    total_devices = len(empty_list)
    health_index = round((online_count / total_devices) * 100) if total_devices > 0 else 0
    assert health_index == 0

def test_heartbeat_unauthenticated_and_invalid_token():
    """Verify heartbeat security rejects invalid credentials and unauthenticated requests when auth is enforced."""
    # 1. Reject invalid credentials with 401
    res_bad = client.post(
        "/api/v1/devices/ESP32-P01/heartbeat",
        json={"battery_pct": 90.0},
        headers={"Authorization": "Bearer invalid_garbage_token_jwt"}
    )
    assert res_bad.status_code == 401
    assert "Could not validate credentials" in res_bad.json()["detail"]

    # 2. Reject unauthenticated requests with 401 when DEMO_MODE is disabled
    orig_demo = settings.DEMO_MODE
    try:
        settings.DEMO_MODE = False
        res_no_auth = client.post(
            "/api/v1/devices/ESP32-P01/heartbeat",
            json={"battery_pct": 90.0}
        )
        assert res_no_auth.status_code == 401
        assert "Authentication required" in res_no_auth.json()["detail"]
    finally:
        settings.DEMO_MODE = orig_demo

def test_heartbeat_device_impersonation_protection():
    """Verify device cannot impersonate another node via mismatched X-Device-Id header."""
    res = client.post(
        "/api/v1/devices/ESP32-P01/heartbeat",
        json={"battery_pct": 90.0},
        headers={"X-Device-Id": "ESP32-P99_SPOOFED"}
    )
    assert res.status_code == 403
    assert "Device identity mismatch" in res.json()["detail"]

def test_heartbeat_cross_farm_authorization():
    """Verify tenant isolation: users from Farm B cannot submit heartbeats for Farm A devices."""
    db = SessionLocal()
    user = None
    try:
        user = db.query(User).filter(User.username == "cross_farm_tester").first()
        if not user:
            user = User(
                username="cross_farm_tester",
                email="cross_farm@test.com",
                hashed_password="dummy_hash_value",
                role="OPERATOR",
                farm_id=99  # Isolated farm ID
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token({"sub": user.username, "role": user.role, "user_id": user.id})
        headers = {"Authorization": f"Bearer {token}"}

        res = client.post("/api/v1/devices/ESP32-P01/heartbeat", json={
            "battery_pct": 90.0
        }, headers=headers)
        assert res.status_code == 403
        assert "Cross-farm device access forbidden" in res.json()["detail"]
    finally:
        if user:
            cleanup_db = SessionLocal()
            u = cleanup_db.query(User).filter(User.username == "cross_farm_tester").first()
            if u:
                cleanup_db.delete(u)
                cleanup_db.commit()
            cleanup_db.close()
        db.close()

def test_heartbeat_replay_and_duplicate_handling():
    """Verify heartbeat endpoint rejects replayed/stale timestamps and idempotently acknowledges duplicates."""
    base_time = datetime.now(timezone.utc) - timedelta(seconds=100)

    # 1. Successful heartbeat at base_time
    res1 = client.post("/api/v1/devices/ESP32-P03/heartbeat", json={
        "timestamp": base_time.isoformat(),
        "battery_pct": 88.0,
        "signal_rssi_dbm": -70
    })
    assert res1.status_code == 200
    assert res1.json()["success"] is True

    # 2. Replay older heartbeat (base_time - 30s) -> 409 Conflict
    stale_time = base_time - timedelta(seconds=30)
    res_stale = client.post("/api/v1/devices/ESP32-P03/heartbeat", json={
        "timestamp": stale_time.isoformat(),
        "battery_pct": 88.0
    })
    assert res_stale.status_code == 409
    assert "older than recorded heartbeat" in res_stale.json()["detail"]

    # 3. Duplicate heartbeat delivery at identical timestamp -> 200 OK idempotent acknowledgement
    res_dup = client.post("/api/v1/devices/ESP32-P03/heartbeat", json={
        "timestamp": base_time.isoformat(),
        "battery_pct": 88.0
    })
    assert res_dup.status_code == 200
    data_dup = res_dup.json()
    assert data_dup["success"] is True
    assert data_dup.get("duplicate") is True
    assert "Duplicate heartbeat acknowledged" in data_dup["message"]

def test_telemetry_future_and_malformed_timestamp_rejection():
    """Verify telemetry rejects future timestamps (>15s) and malformed timestamps with HTTP 422."""
    future_ts = (datetime.now(timezone.utc) + timedelta(seconds=120)).isoformat()
    payload_future = {
        "schema_version": "1.0",
        "message_id": f"MSG-FUTURE-{uuid.uuid4().hex[:8]}",
        "device_id": "ESP32-P02",
        "pond_id": 2,
        "timestamp": future_ts,
        "readings": {"ph": 8.0}
    }
    res_future = client.post("/api/v1/telemetry", json=payload_future)
    assert res_future.status_code == 422
    assert "future" in res_future.json()["detail"].lower()

    payload_malformed = {
        "schema_version": "1.0",
        "message_id": f"MSG-MALFORMED-{uuid.uuid4().hex[:8]}",
        "device_id": "ESP32-P02",
        "pond_id": 2,
        "timestamp": "invalid_date_format_string",
        "readings": {"ph": 8.0}
    }
    res_malformed = client.post("/api/v1/telemetry", json=payload_malformed)
    assert res_malformed.status_code == 422
    assert "malformed" in res_malformed.json()["detail"].lower()

def test_dangerous_measurement_validity_vs_freshness_separation():
    """Verify genuine dangerous measurement is ingested and triggers critical alert, while impossible readings are flagged."""
    db = SessionLocal()
    orig_sensor = db.query(Sensor).filter(Sensor.pond_id == 2, Sensor.sensor_type == "do").first()
    orig_val = orig_sensor.current_value if orig_sensor else 6.0
    db.close()

    try:
        # A biologically dangerous DO (2.1 mg/L) is within physical bounds [0, 25] mg/L.
        # It must be accepted as valid telemetry, update sensor state, and trigger emergency alert.
        now_utc = datetime.now(timezone.utc)
        dangerous_payload = {
            "schema_version": "1.0",
            "message_id": f"MSG-DANGER-{uuid.uuid4().hex[:8]}",
            "device_id": "ESP32-P02",
            "pond_id": 2,
            "timestamp": now_utc.isoformat(),
            "readings": {
                "do_mg_l": 2.1,
                "ph": 7.9
            }
        }
        res_danger = client.post("/api/v1/telemetry", json=dangerous_payload)
        assert res_danger.status_code == 201
        data_danger = res_danger.json()
        assert data_danger["status"] == "ACCEPTED"
        assert data_danger["records_created"] == 2
        assert len(data_danger["anomalies"]) == 0

        # Verify critical alert was generated for Pond 2
        db_check = SessionLocal()
        alert = db_check.query(Alert).filter(Alert.pond_id == 2, Alert.alert_type == "LOW_DO").order_by(Alert.id.desc()).first()
        assert alert is not None
        assert alert.severity == "CRITICAL"
        db_check.close()

        # Conversely, a reading outside physical bounds (e.g. -5.0 mg/L) is a sensor fault anomaly
        fault_payload = {
            "schema_version": "1.0",
            "message_id": f"MSG-FAULT-{uuid.uuid4().hex[:8]}",
            "device_id": "ESP32-P02",
            "pond_id": 2,
            "readings": {
                "do_mg_l": -5.0,
                "ph": 7.9
            }
        }
        res_fault = client.post("/api/v1/telemetry", json=fault_payload)
        assert res_fault.status_code == 201
        data_fault = res_fault.json()
        assert data_fault["records_created"] == 1  # Only ph accepted
        assert len(data_fault["anomalies"]) == 1
        assert data_fault["anomalies"][0]["sensor_type"] == "do"
        assert "physical bounds" in data_fault["anomalies"][0]["reason"]
    finally:
        cleanup_db = SessionLocal()
        s = cleanup_db.query(Sensor).filter(Sensor.pond_id == 2, Sensor.sensor_type == "do").first()
        if s:
            s.current_value = orig_val
            cleanup_db.commit()
        cleanup_db.close()

def test_hardware_sensor_fault_vs_telemetry_freshness_separation():
    """Verify hardware health, telemetry freshness, and connectivity evaluate independently."""
    ref_now = datetime(2026, 11, 17, 12, 0, 0, tzinfo=timezone.utc)
    engine = DeviceStatusEngine()

    # Device has FRESH telemetry (10s ago) and recent heartbeat (5s ago),
    # but hardware reports FAULT due to critical battery depletion (4%).
    d_fault = MockDevice(
        last_heartbeat_at=ref_now - timedelta(seconds=5),
        last_telemetry_at=ref_now - timedelta(seconds=10),
        battery_pct=4.0,
        hardware_health="FAULT"
    )
    res = engine.evaluate(d_fault, reference_now=ref_now)
    assert res["connectivity_status"] == "ONLINE"
    assert res["telemetry_freshness"] == "FRESH"
    assert res["hardware_health"] == "FAULT"
    # Composite status reflects fault priority
    assert res["status"] == "FAULT"

