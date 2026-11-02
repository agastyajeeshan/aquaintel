"""
Unit & Integration Test Suite for AquaIntel Edge-Cloud Hybrid Architecture & Remote Farm Monitoring
Validates:
- Physical farm edge layer autonomy & local safety supremacy
- Persistent edge buffering during internet outages
- Authenticated remote actuator command dispatch with TTL expiry
- Local safety supremacy blocking unsafe remote commands (hypoxia / ammonia holds)
- Expired command rejection at edge gateway
- Idempotent cloud resynchronization with SHA-256 deduplication
- Connection loss & restoration farmer notifications
"""

import pytest
import time
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import (
    FarmGateway, EdgeSyncBatch, RemoteCommandRecord, EdgeTelemetryBuffer,
    Pond, Sensor, SensorReading, Aerator, Feeder, NotificationLog
)
from app.core.edge_gateway import edge_gateway
from app.core.hal import hal

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_edge_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Ensure default gateway exists
    gw = db.query(FarmGateway).filter(FarmGateway.gateway_id == "GW-NELLORE-DELTA-01").first()
    if not gw:
        gw = FarmGateway(
            gateway_id="GW-NELLORE-DELTA-01",
            farm_id=1,
            name="Nellore Delta Industrial Edge Controller",
            status="ONLINE"
        )
        db.add(gw)
        db.commit()
    # Reset network connectivity to online
    edge_gateway.set_connectivity(True, db=db)
    hal._last_state_changes.clear()
    hal._fault_injections.clear()
    yield
    db.close()

@pytest.fixture(autouse=True)
def reset_hal():
    hal._last_state_changes.clear()
    hal._fault_injections.clear()
    yield

def test_edge_gateway_status_and_heartbeat():
    """Verify gateway status retrieval and authenticated heartbeat ping."""
    res = client.get("/api/cloud/status")
    assert res.status_code == 200
    data = res.json()
    assert data["gateway_id"] == "GW-NELLORE-DELTA-01"
    assert "status" in data
    assert data["local_edge_safety_active"] is True

    # Send heartbeat
    hb_res = client.post("/api/cloud/heartbeat?gateway_id=GW-NELLORE-DELTA-01")
    assert hb_res.status_code == 200
    assert hb_res.json()["status"] == "HEARTBEAT_ACK"

def test_offline_telemetry_buffering_during_outage():
    """Verify that when internet uplink is severed, sensor telemetry is spooled in EdgeTelemetryBuffer."""
    db = SessionLocal()
    try:
        # 1. Disconnect Internet
        client.post("/api/cloud/simulate-network", json={"action": "DISCONNECT_INTERNET"})
        assert edge_gateway.is_connected is False

        # 2. Ingest sensor reading at edge while offline
        res = edge_gateway.ingest_sensor_reading(
            db=db,
            pond_id=3,
            sensor_type="do",
            value=5.4,
            unit="mg/L"
        )
        assert res["success"] is True
        assert res["buffered"] is True

        # Verify entry exists in EdgeTelemetryBuffer with is_synced=False
        buf = db.query(EdgeTelemetryBuffer).filter(
            EdgeTelemetryBuffer.record_uuid == res["record_uuid"]
        ).first()
        assert buf is not None
        assert buf.is_synced is False
        assert buf.value == 5.4
    finally:
        # Reconnect
        edge_gateway.set_connectivity(True, db=db)
        db.close()

def test_local_edge_emergency_aeration_continues_offline():
    """Verify that emergency aeration cascade operates autonomously on edge even with zero internet connectivity."""
    db = SessionLocal()
    try:
        # Disconnect cloud
        edge_gateway.set_connectivity(False, db=db)
        assert hal.is_cloud_connected() is False

        # Local emergency low DO event (2.7 mg/L)
        success, msg, act = hal.dispatch_command(
            db=db,
            pond_id=4,
            equipment_type="AERATOR",
            equipment_code="AER-P04-1",
            action="START",
            params={"reason": "Local Edge Hypoxia Failsafe Cascade", "trigger_do": 2.7}
        )
        assert success is True
        assert act is not None
        assert act.equipment_ack_status == "ACKNOWLEDGED"

        # Verify aerator status updated to RUNNING in local state
        aer = db.query(Aerator).filter(Aerator.aerator_code == "AER-P04-1").first()
        assert aer.status == "RUNNING"
    finally:
        edge_gateway.set_connectivity(True, db=db)
        db.close()

def test_remote_command_issuance_and_execution():
    """Verify farmer can issue authenticated remote command with TTL and receive edge execution feedback."""
    res = client.post("/api/cloud/remote-command", json={
        "pond_id": 4,
        "device_id": "AER-P04-2",
        "equipment_type": "AERATOR",
        "action": "START",
        "parameters": {"reason": "Supplemental afternoon DO boost"},
        "operator_name": "Dr. K. Srinivas",
        "user_role": "ADMIN",
        "ttl_seconds": 120,
        "confirmed_by_user": True
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "EXECUTED_ACK"
    assert "command_id" in data

    # Verify remote command record
    db = SessionLocal()
    try:
        cmd = db.query(RemoteCommandRecord).filter(
            RemoteCommandRecord.command_id == data["command_id"]
        ).first()
        assert cmd is not None
        assert cmd.status == "EXECUTED_ACK"
        assert cmd.equipment_feedback == "RUNNING"
    finally:
        db.close()

def test_local_safety_supremacy_blocks_unsafe_remote_aerator_stop():
    """
    CRITICAL MANDATORY SAFETY RULE:
    When pond is in emergency hypoxia (< 3.8 mg/L), remote command to STOP aerators
    MUST be blocked by local edge safety supremacy.
    """
    db = SessionLocal()
    try:
        # Force pond DO to critical low level
        sensor = db.query(Sensor).filter(Sensor.pond_id == 4, Sensor.sensor_type == "do").first()
        sensor.current_value = 2.6
        db.commit()

        # Farmer attempts remote STOP command
        res = client.post("/api/cloud/remote-command", json={
            "pond_id": 4,
            "device_id": "AER-P04-1",
            "equipment_type": "AERATOR",
            "action": "STOP",
            "parameters": {"reason": "Accidental or unauthorized shutdown"},
            "operator_name": "Remote Operator",
            "user_role": "OPERATOR",
            "ttl_seconds": 60,
            "confirmed_by_user": True
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["status"] == "REJECTED_LOCAL_SAFETY_HOLD"
        assert "hypoxia" in data["message"].lower()

        # Restore nominal DO
        sensor.current_value = 6.2
        db.commit()
    finally:
        db.close()

def test_local_safety_supremacy_blocks_unsafe_remote_feeding():
    """
    CRITICAL MANDATORY SAFETY RULE:
    When pond toxic ammonia exceeds 0.05 mg/L, remote command to DISPENSE feed
    MUST be blocked by local edge safety supremacy.
    """
    db = SessionLocal()
    try:
        # Set high TAN/ammonia and high pH -> high toxic un-ionized NH3
        ammonia_sensor = db.query(Sensor).filter(Sensor.pond_id == 4, Sensor.sensor_type.in_(["ammonia", "tan"])).first()
        ph_sensor = db.query(Sensor).filter(Sensor.pond_id == 4, Sensor.sensor_type == "ph").first()
        temp_sensor = db.query(Sensor).filter(Sensor.pond_id == 4, Sensor.sensor_type == "temperature").first()

        ammonia_sensor.current_value = 0.35
        ph_sensor.current_value = 8.8
        temp_sensor.current_value = 32.0
        db.commit()

        # Farmer attempts remote feed dispense
        res = client.post("/api/cloud/remote-command", json={
            "pond_id": 4,
            "device_id": "FEEDER-P04",
            "equipment_type": "FEEDER",
            "action": "DISPENSE",
            "parameters": {"amount_kg": 15.0},
            "operator_name": "Field Operator",
            "user_role": "OPERATOR",
            "confirmed_by_user": True
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["status"] == "REJECTED_LOCAL_SAFETY_HOLD"
        assert "ammonia" in data["message"].lower()

        # Restore nominal readings
        ammonia_sensor.current_value = 0.04
        ph_sensor.current_value = 7.9
        temp_sensor.current_value = 28.5
        db.commit()
    finally:
        db.close()

def test_expired_remote_command_rejection():
    """Verify that edge gateway discards past-due commands that exceed their TTL."""
    db = SessionLocal()
    try:
        expired_id = f"CMD-TEST-EXP-{uuid.uuid4().hex[:6].upper()}"
        cmd_rec = RemoteCommandRecord(
            command_id=expired_id,
            farm_id=1,
            pond_id=4,
            device_id="AER-P04-3",
            equipment_type="AERATOR",
            action="START",
            status="QUEUED",
            issued_by_user="Operator",
            user_role="OPERATOR",
            issued_at=datetime.now(timezone.utc) - timedelta(seconds=120),
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=30),  # expired 30s ago
            ttl_seconds=60
        )
        db.add(cmd_rec)
        db.commit()

        success, msg, cmd = edge_gateway.process_remote_command(
            db=db,
            command_id=expired_id,
            pond_id=4,
            device_id="AER-P04-3",
            equipment_type="AERATOR",
            action="START"
        )
        assert success is False
        assert cmd.status == "EXPIRED"
        assert "expired" in msg.lower()
    finally:
        db.close()

def test_idempotent_buffer_sync_after_reconnection():
    """Verify that buffered offline records synchronize cleanly to cloud and update sensor values."""
    db = SessionLocal()
    try:
        # Ingest offline readings
        edge_gateway.set_connectivity(False, db=db)
        r1 = edge_gateway.ingest_sensor_reading(db, pond_id=5, sensor_type="do", value=6.85, unit="mg/L")
        r2 = edge_gateway.ingest_sensor_reading(db, pond_id=5, sensor_type="temperature", value=29.4, unit="°C")
        assert r1["buffered"] is True
        assert r2["buffered"] is True

        # Reconnect
        edge_gateway.set_connectivity(True, db=db)

        # Trigger sync flush
        sync_res = edge_gateway.flush_and_sync_buffer(db)
        assert sync_res["status"] == "SUCCESS"
        assert sync_res["synced_count"] >= 2

        # Verify live sensor updated to latest buffered reading
        sensor = db.query(Sensor).filter(Sensor.pond_id == 5, Sensor.sensor_type == "do").first()
        assert sensor.current_value == 6.85
    finally:
        db.close()

def test_duplicate_batch_sync_prevention():
    """Verify that identical re-transmitted sync batches are reconciled idempotently without duplicate inserts."""
    db = SessionLocal()
    try:
        # Trigger second sync when no un-synced data
        res = edge_gateway.flush_and_sync_buffer(db)
        assert res["status"] == "NO_BUFFERED_DATA"
    finally:
        db.close()

def test_disconnect_and_reconnect_notifications():
    """Verify notifications are dispatched when gateway disconnects and reconnects."""
    db = SessionLocal()
    try:
        # Disconnect
        edge_gateway.set_connectivity(False, db=db)
        notif1 = db.query(NotificationLog).filter(
            NotificationLog.title.contains("Outage")
        ).order_by(NotificationLog.timestamp.desc()).first()
        assert notif1 is not None
        assert notif1.structured_payload.get("condition_detected") == "INTERNET_DISCONNECTED"
        assert "outage" in notif1.title.lower() or "disconnected" in notif1.title.lower()

        # Reconnect
        edge_gateway.set_connectivity(True, db=db)
        notif2 = db.query(NotificationLog).filter(
            NotificationLog.title.contains("Restored")
        ).order_by(NotificationLog.timestamp.desc()).first()
        assert notif2 is not None
        assert notif2.structured_payload.get("condition_detected") == "INTERNET_RECONNECTED"
        assert "restored" in notif2.title.lower() or "reconnected" in notif2.title.lower()
    finally:
        db.close()

def test_unauthorized_user_role_blocked():
    """Verify that users without valid actuator role (e.g. VIEWER) cannot issue remote physical commands."""
    res = client.post("/api/cloud/remote-command", json={
        "pond_id": 4,
        "device_id": "AER-P04-1",
        "equipment_type": "AERATOR",
        "action": "START",
        "operator_name": "External Auditor",
        "user_role": "VIEWER",
        "confirmed_by_user": True
    })
    assert res.status_code == 403
    assert "not authorized" in res.json()["detail"].lower()
