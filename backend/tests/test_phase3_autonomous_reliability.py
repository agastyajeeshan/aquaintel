"""
Phase 3 Verification Test Suite: Autonomous Engine Reliability & Command Lifecycle
AquaIntel Platform

Covers all 14 Phase 3 verification items:
1. Duplicate outage alert suppression during ongoing outage.
2. Genuinely new alert creation after previous outage resolution.
3. Separate events with similar titles not falsely suppressed.
4. Autonomous engine repeated evaluation idempotency (no command/event spam).
5. Unique command ID enforcement & idempotency.
6. Duplicate command submission handling (in-flight deduplication).
7. Controller ACK vs actuator physical EXECUTED distinction.
8. Command timeout and database persistence of EXPIRED status.
9. Gateway disconnect queues remote commands with TTL.
10. Stale queued command rejection and EXPIRED transition upon reconnect.
11. Safe post-reconnect command execution within valid TTL.
12. Local edge emergency safety supremacy (blocks remote aerator stop during hypoxia).
13. Phase 1 Smart Feeding regression verification.
14. Phase 2 IoT heartbeat and status regression verification.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import (
    User, Farm, Pond, Sensor, Aerator, Feeder, IoTDevice,
    Alert, DeviceCommand, RemoteCommandRecord,
    AutonomousDecisionEvent, AutonomousActionRecord, NotificationLog
)
from app.core.edge_gateway import edge_gateway
from app.core.autonomous_engine import autonomous_engine
from app.core.hal import hal
from app.core.notification_service import notification_service
from app.api.alerts import create_or_deduplicate_alert, resolve_alert_by_type

client = TestClient(app)


def get_auth_token(username: str = "operator", password: str = "operator123"):
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture(scope="module", autouse=True)
def setup_test_environment():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Ensure nominal gateway is online initially
    edge_gateway.set_connectivity(True, db=db)
    db.close()
    yield
    db = SessionLocal()
    edge_gateway.set_connectivity(True, db=db)
    db.close()


def test_1_duplicate_outage_alert_suppression():
    """Verify that during an ongoing gateway outage, repeated calls do not create duplicate active alerts."""
    db = SessionLocal()
    try:
        # Trigger outage
        edge_gateway.set_connectivity(False, db=db)

        # Attempt to create duplicate outage alerts repeatedly for the same gateway
        for _ in range(5):
            alert = create_or_deduplicate_alert(
                db=db,
                pond_id=None,
                device_id=edge_gateway._gateway_id,
                alert_type="GATEWAY_OFFLINE",
                severity="WARNING",
                title="Edge Gateway Internet Outage — Nellore Delta Facility",
                description="Repeated detection cycle",
                cause="Repeated ping check"
            )
            assert alert is not None

        # Check total active GATEWAY_OFFLINE alerts for this gateway in DB
        active_outage_alerts = db.query(Alert).filter(
            Alert.pond_id.is_(None),
            Alert.device_id == edge_gateway._gateway_id,
            Alert.alert_type == "GATEWAY_OFFLINE",
            Alert.status == "ACTIVE"
        ).all()

        assert len(active_outage_alerts) == 1, f"Expected exactly 1 active outage alert, found {len(active_outage_alerts)}"
    finally:
        edge_gateway.set_connectivity(True, db=db)
        db.close()


def test_2_alert_created_after_resolution():
    """Verify that a resolved outage alert followed by a genuine new occurrence creates a fresh alert."""
    db = SessionLocal()
    try:
        # 1. Outage occurs
        edge_gateway.set_connectivity(False, db=db)
        alert1 = db.query(Alert).filter(
            Alert.pond_id.is_(None),
            Alert.alert_type == "GATEWAY_OFFLINE",
            Alert.status == "ACTIVE"
        ).order_by(Alert.created_at.desc()).first()
        assert alert1 is not None

        # 2. Connection restored and previous alert resolved
        edge_gateway.set_connectivity(True, db=db)
        db.refresh(alert1)
        assert alert1.status == "RESOLVED"
        assert alert1.resolved_by == "SYSTEM_RECONNECT"
        assert alert1.resolved_at is not None

        # 3. New outage occurs later
        edge_gateway.set_connectivity(False, db=db)
        alert2 = db.query(Alert).filter(
            Alert.pond_id.is_(None),
            Alert.alert_type == "GATEWAY_OFFLINE",
            Alert.status == "ACTIVE"
        ).order_by(Alert.created_at.desc()).first()

        assert alert2 is not None
        assert alert2.id != alert1.id, "A resolved event followed by genuine new occurrence must create a new alert."
    finally:
        edge_gateway.set_connectivity(True, db=db)
        db.close()


def test_3_distinct_events_not_suppressed():
    """Verify that separate events with similar titles or severities are not falsely suppressed."""
    db = SessionLocal()
    try:
        # Create alert for Pond 1 Low DO
        a1 = create_or_deduplicate_alert(
            db=db,
            pond_id=1,
            alert_type="LOW_DO",
            severity="CRITICAL",
            title="Critical Low Dissolved Oxygen Alert",
            description="DO dropped below 3.5 mg/L on Pond 1"
        )

        # Create alert for Pond 2 Low DO (similar title, different pond_id)
        a2 = create_or_deduplicate_alert(
            db=db,
            pond_id=2,
            alert_type="LOW_DO",
            severity="CRITICAL",
            title="Critical Low Dissolved Oxygen Alert",
            description="DO dropped below 3.5 mg/L on Pond 2"
        )

        # Create alert for Pond 1 High Ammonia (same pond, different alert_type)
        a3 = create_or_deduplicate_alert(
            db=db,
            pond_id=1,
            alert_type="HIGH_AMMONIA",
            severity="CRITICAL",
            title="Critical Toxic Ammonia Alert",
            description="TAN concentration spike on Pond 1"
        )

        assert a1.id != a2.id, "Pond 1 and Pond 2 distinct events must not suppress each other."
        assert a1.id != a3.id, "Different alert types on the same pond must not suppress each other."
    finally:
        resolve_alert_by_type(db, 1, "LOW_DO")
        resolve_alert_by_type(db, 2, "LOW_DO")
        resolve_alert_by_type(db, 1, "HIGH_AMMONIA")
        db.close()


def test_4_autonomous_engine_evaluation_idempotency():
    """Verify that repeated evaluate_pond cycles during persistent hypoxia do not spam duplicate commands/events."""
    db = SessionLocal()
    try:
        # Run 1st evaluation cycle on Pond 4 with critical hypoxia
        events1 = autonomous_engine.evaluate_pond(db, 4, simulated_override={"do": 2.7, "temperature": 29.0})
        assert len(events1) >= 1
        initial_event_id = events1[0].event_id

        # Count action records for Pond 4
        initial_actions_count = db.query(AutonomousActionRecord).filter(
            AutonomousActionRecord.pond_id == 4
        ).count()

        # Run 2nd evaluation cycle with identical condition while aerators are already RUNNING
        events2 = autonomous_engine.evaluate_pond(db, 4, simulated_override={"do": 2.7, "temperature": 29.0})
        assert len(events2) >= 1
        assert events2[0].event_id == initial_event_id, "Repeated evaluation should retain ongoing event ID."

        second_actions_count = db.query(AutonomousActionRecord).filter(
            AutonomousActionRecord.pond_id == 4
        ).count()

        assert second_actions_count == initial_actions_count, "No redundant action records should be created when aerators are already running."
    finally:
        db.close()


def test_5_unique_command_id_enforcement():
    """Verify unique command_id enforcement and idempotent submission."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}
    cmd_id = f"CMD-TEST-IDEM-{uuid.uuid4().hex[:8].upper()}"

    payload = {
        "command_id": cmd_id,
        "device_id": "ESP32-P05",
        "action": "SET_STATE",
        "target_state": "ON",
        "reason": "Test idempotency",
        "expires_in_seconds": 60
    }

    # 1st Submission
    res1 = client.post("/api/v1/devices/ESP32-P05/commands", headers=headers, json=payload)
    assert res1.status_code == 201
    assert res1.json()["command_id"] == cmd_id

    # 2nd Submission with exact same command_id
    res2 = client.post("/api/v1/devices/ESP32-P05/commands", headers=headers, json=payload)
    assert res2.status_code == 201
    assert res2.json()["command_id"] == cmd_id

    # Verify only 1 command record exists in DB
    db = SessionLocal()
    try:
        count = db.query(DeviceCommand).filter(DeviceCommand.command_id == cmd_id).count()
        assert count == 1, f"Expected exactly 1 record for unique command_id, found {count}"
    finally:
        db.close()


def test_6_duplicate_command_submission_handling():
    """Verify that submitting identical in-flight commands for the same device and action is handled cleanly."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "device_id": "ESP32-P02",
        "action": "SET_MODE",
        "target_state": "AUTO",
        "reason": "Test duplicate in-flight",
        "expires_in_seconds": 120
    }

    # Submit first command
    res1 = client.post("/api/v1/devices/ESP32-P02/commands", headers=headers, json=payload)
    assert res1.status_code == 201
    cmd1_id = res1.json()["command_id"]

    # Submit duplicate command for same device & action without explicit command_id
    res2 = client.post("/api/v1/devices/ESP32-P02/commands", headers=headers, json=payload)
    assert res2.status_code == 201
    data2 = res2.json()

    # Must deduplicate and return the in-flight command
    assert data2["command_id"] == cmd1_id
    assert "delivery_state" in data2
    assert data2["delivery_state"] == "IN_FLIGHT_DEDUPLICATED"


def test_7_command_lifecycle_ack_vs_executed():
    """Verify state machine distinguishes controller ACK from actuator physical EXECUTED."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}
    cmd_id = f"CMD-LIFECYCLE-{uuid.uuid4().hex[:8].upper()}"

    # 1. Issue command (QUEUED / PENDING)
    res_issue = client.post("/api/v1/devices/ESP32-P03/commands", headers=headers, json={
        "command_id": cmd_id,
        "device_id": "ESP32-P03",
        "action": "SET_STATE",
        "target_state": "ON",
        "expires_in_seconds": 60
    })
    assert res_issue.status_code == 201

    # 2. Controller Acknowledgement (edge device received command)
    res_ack = client.post("/api/v1/devices/ESP32-P03/ack", json={
        "command_id": cmd_id,
        "device_id": "ESP32-P03",
        "status": "ACKNOWLEDGED",
        "actual_state": "RECEIVING"
    })
    assert res_ack.status_code == 200
    assert res_ack.json()["current_status"] == "ACKNOWLEDGED"

    db = SessionLocal()
    try:
        cmd_db = db.query(DeviceCommand).filter(DeviceCommand.command_id == cmd_id).first()
        assert cmd_db.status == "ACKNOWLEDGED"
        assert cmd_db.acknowledged_at is not None
        assert cmd_db.completed_at is None  # Not yet executed!

        # 3. Actuator Execution (motor/relay engaged and confirmed)
        res_exec = client.post("/api/v1/devices/ESP32-P03/ack", json={
            "command_id": cmd_id,
            "device_id": "ESP32-P03",
            "status": "EXECUTED",
            "actual_state": "ON"
        })
        assert res_exec.status_code == 200
        assert res_exec.json()["current_status"] == "EXECUTED"

        db.refresh(cmd_db)
        assert cmd_db.status == "EXECUTED"
        assert cmd_db.completed_at is not None
    finally:
        db.close()


def test_8_command_timeout_expiry_persistence():
    """Verify that expired commands transition cleanly to EXPIRED and are persisted to the database."""
    db = SessionLocal()
    try:
        stale_cmd_id = f"CMD-STALE-{uuid.uuid4().hex[:8].upper()}"
        past_time = datetime.now(timezone.utc) - timedelta(seconds=60)
        expired_record = DeviceCommand(
            command_id=stale_cmd_id,
            device_id="ESP32-P04",
            pond_id=4,
            action="SET_STATE",
            status="PENDING",
            issued_at=past_time - timedelta(seconds=60),
            expires_at=past_time  # expired 60s ago
        )
        db.add(expired_record)
        db.commit()

        # Query commands endpoint
        res = client.get("/api/v1/devices/ESP32-P04/commands")
        assert res.status_code == 200
        cmd_entry = next((c for c in res.json() if c["command_id"] == stale_cmd_id), None)
        assert cmd_entry is not None
        assert cmd_entry["status"] == "EXPIRED"

        # Check DB directly to ensure EXPIRED status was persisted
        db.refresh(expired_record)
        assert expired_record.status == "EXPIRED"
        assert "expired" in expired_record.error_message.lower()
    finally:
        db.close()


def test_9_gateway_offline_queues_remote_commands():
    """Verify that issuing remote commands while gateway is disconnected queues them with TTL."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        # Disconnect gateway
        edge_gateway.set_connectivity(False, db=db)

        # Issue remote command
        res = client.post("/api/v1/cloud/remote-command", headers=headers, json={
            "pond_id": 4,
            "device_id": "AER-P04-2",
            "equipment_type": "AERATOR",
            "action": "START",
            "ttl_seconds": 60,
            "confirmed_by_user": True
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["status"] == "QUEUED"
        assert "queued on cloud" in data["message"].lower()

        # Verify command is queued in DB
        cmd_rec = db.query(RemoteCommandRecord).filter(RemoteCommandRecord.command_id == data["command_id"]).first()
        assert cmd_rec is not None
        assert cmd_rec.status == "QUEUED"
    finally:
        edge_gateway.set_connectivity(True, db=db)
        db.close()


def test_10_gateway_reconnect_expires_stale_commands():
    """Verify that on gateway reconnect, stale queued commands exceeding TTL transition to EXPIRED."""
    db = SessionLocal()
    try:
        edge_gateway.set_connectivity(False, db=db)
        stale_remote_id = f"CMD-REMOTE-STALE-{uuid.uuid4().hex[:6].upper()}"

        # Insert a queued remote command that expired while gateway was offline
        stale_cmd = RemoteCommandRecord(
            command_id=stale_remote_id,
            farm_id=1,
            pond_id=4,
            device_id="AER-P04-2",
            equipment_type="AERATOR",
            action="START",
            status="QUEUED",
            issued_by_user="Operator",
            user_role="OPERATOR",
            issued_at=datetime.now(timezone.utc) - timedelta(seconds=180),
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=30),  # expired 30s ago
            ttl_seconds=60
        )
        db.add(stale_cmd)
        db.commit()

        # Reconnect gateway
        edge_gateway.set_connectivity(True, db=db)

        # Verify command was transitioned to EXPIRED, never executed
        db.refresh(stale_cmd)
        assert stale_cmd.status == "EXPIRED"
        assert "expired" in stale_cmd.rejection_reason.lower()
        assert stale_cmd.executed_at is None
    finally:
        db.close()


def test_11_gateway_reconnect_executes_valid_commands():
    """Verify that queued commands within valid TTL are safely executed upon gateway reconnect."""
    db = SessionLocal()
    try:
        edge_gateway.set_connectivity(False, db=db)
        valid_remote_id = f"CMD-REMOTE-VALID-{uuid.uuid4().hex[:6].upper()}"

        # Ensure no hysteresis hold on test aerator
        hal.clear_fault("AER-P07-1")
        hal._last_state_changes.pop("AER-P07-1", None)

        # Insert queued command with plenty of TTL (300s)
        now_utc = datetime.now(timezone.utc)
        valid_cmd = RemoteCommandRecord(
            command_id=valid_remote_id,
            farm_id=1,
            pond_id=7,
            device_id="AER-P07-1",
            equipment_type="AERATOR",
            action="START",
            status="QUEUED",
            issued_by_user="Operator",
            user_role="OPERATOR",
            issued_at=now_utc,
            expires_at=now_utc + timedelta(seconds=300),
            ttl_seconds=300
        )
        db.add(valid_cmd)
        db.commit()

        # Reconnect gateway
        edge_gateway.set_connectivity(True, db=db)

        # Verify command transitioned to EXECUTED_ACK
        db.refresh(valid_cmd)
        assert valid_cmd.status == "EXECUTED_ACK"
        assert valid_cmd.executed_at is not None
        assert valid_cmd.equipment_feedback == "RUNNING"
    finally:
        db.close()


def test_12_local_edge_safety_supremacy_blocks_remote_aerator_stop():
    """Verify that local edge safety supremacy blocks remote aerator stop commands during hypoxia."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        # Force pond DO to critical hypoxia (2.6 mg/L)
        sensor = db.query(Sensor).filter(Sensor.pond_id == 4, Sensor.sensor_type == "do").first()
        assert sensor is not None
        sensor.current_value = 2.6
        db.commit()

        # Attempt to remotely STOP aerator during hypoxia
        res = client.post("/api/v1/cloud/remote-command", headers=headers, json={
            "pond_id": 4,
            "device_id": "AER-P04-1",
            "equipment_type": "AERATOR",
            "action": "STOP",
            "ttl_seconds": 60,
            "confirmed_by_user": True
        })
        assert res.status_code == 200
        data = res.json()

        assert data["success"] is False
        assert data["status"] == "REJECTED_LOCAL_SAFETY_HOLD"
        assert "hypoxia" in data["rejection_reason"].lower()

        # Restore nominal DO
        sensor.current_value = 6.2
        db.commit()
    finally:
        db.close()


def test_13_phase1_smart_feeding_regression():
    """Regression check: verify Smart Feeding feeders retain unique identities and nominal values."""
    db = SessionLocal()
    try:
        feeders = db.query(Feeder).all()
        assert len(feeders) > 0

        # Unique feeder codes
        feeder_codes = [f.feeder_code for f in feeders]
        assert len(feeder_codes) == len(set(feeder_codes)), "Feeder codes must be unique."

        # Verify feeding endpoint
        res = client.get("/api/v1/feeding/status")
        assert res.status_code == 200
        data = res.json()
        assert "feeders" in data
        assert len(data["feeders"]) > 0
    finally:
        db.close()


def test_14_phase2_iot_device_status_regression():
    """Regression check: verify IoT device status engine, heartbeat, and freshness checks remain stable."""
    res = client.get("/api/v1/devices")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "devices" in data

    summary = data["summary"]
    assert "total_devices" in summary
    assert "online_devices" in summary
    assert "stale_devices" in summary
    assert "fresh_telemetry_count" in summary

    # Verify heartbeat endpoint
    hb_res = client.post("/api/v1/devices/ESP32-P01/heartbeat", json={
        "battery_pct": 94.0,
        "signal_rssi_dbm": -68,
        "hardware_health": "HEALTHY"
    })
    assert hb_res.status_code == 200
    assert hb_res.json()["success"] is True


def test_15_multi_gateway_independent_outage_alerts():
    """Verify that distinct gateways (e.g. GW-01 vs GW-02) generate independent active alerts simultaneously."""
    db = SessionLocal()
    try:
        # Trigger outage on Gateway 1
        a1 = create_or_deduplicate_alert(
            db=db,
            pond_id=None,
            device_id="GW-01",
            alert_type="GATEWAY_OFFLINE",
            severity="WARNING",
            title="Edge Gateway Internet Outage — GW-01",
            description="Uplink lost for GW-01"
        )
        assert a1 is not None

        # Trigger outage on Gateway 2
        a2 = create_or_deduplicate_alert(
            db=db,
            pond_id=None,
            device_id="GW-02",
            alert_type="GATEWAY_OFFLINE",
            severity="WARNING",
            title="Edge Gateway Internet Outage — GW-02",
            description="Uplink lost for GW-02"
        )
        assert a2 is not None

        # Both alerts must exist independently and be active
        gw1_alerts = db.query(Alert).filter(
            Alert.device_id == "GW-01",
            Alert.alert_type == "GATEWAY_OFFLINE",
            Alert.status == "ACTIVE"
        ).all()
        gw2_alerts = db.query(Alert).filter(
            Alert.device_id == "GW-02",
            Alert.alert_type == "GATEWAY_OFFLINE",
            Alert.status == "ACTIVE"
        ).all()
        assert len(gw1_alerts) == 1
        assert len(gw2_alerts) == 1
        assert gw1_alerts[0].id != gw2_alerts[0].id

        # Resolving GW-01 must not resolve GW-02
        resolve_alert_by_type(db=db, pond_id=None, device_id="GW-01", alert_type="GATEWAY_OFFLINE")
        gw1_after = db.query(Alert).filter(Alert.device_id == "GW-01", Alert.status == "ACTIVE").all()
        gw2_after = db.query(Alert).filter(Alert.device_id == "GW-02", Alert.status == "ACTIVE").all()
        assert len(gw1_after) == 0
        assert len(gw2_after) == 1
    finally:
        resolve_alert_by_type(db=db, pond_id=None, device_id="GW-02", alert_type="GATEWAY_OFFLINE")
        db.close()


def test_16_command_id_conflict_rejection():
    """Verify that reusing a command_id for a different device or action returns HTTP 409 Conflict."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}
    test_cmd_id = f"CMD-CONFLICT-{uuid.uuid4().hex[:8].upper()}"

    # Issue initial command to ESP32-P01
    res1 = client.post("/api/v1/devices/ESP32-P01/commands", headers=headers, json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P01",
        "action": "START",
        "reason": "Initial command"
    })
    assert res1.status_code == 201

    # Attempt to issue same command_id with a different action
    res2 = client.post("/api/v1/devices/ESP32-P01/commands", headers=headers, json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P01",
        "action": "STOP",
        "reason": "Conflicting action"
    })
    assert res2.status_code == 409
    assert "conflict" in res2.json()["detail"].lower()

    # Attempt to issue same command_id to a different device
    res3 = client.post("/api/v1/devices/ESP32-P02/commands", headers=headers, json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P02",
        "action": "START",
        "reason": "Conflicting device"
    })
    assert res3.status_code == 409
    assert "conflict" in res3.json()["detail"].lower()


def test_17_terminal_command_immutability():
    """Verify that commands in terminal states cannot be transitioned back to execution."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}
    test_cmd_id = f"CMD-TERM-{uuid.uuid4().hex[:8].upper()}"

    # Issue command that will expire immediately
    res1 = client.post("/api/v1/devices/ESP32-P01/commands", headers=headers, json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P01",
        "action": "START",
        "expires_in_seconds": 1
    })
    assert res1.status_code == 201

    db = SessionLocal()
    try:
        cmd = db.query(DeviceCommand).filter(DeviceCommand.command_id == test_cmd_id).first()
        assert cmd is not None
        cmd.status = "FAILED"
        cmd.error_message = "Motor hardware trip failure"
        db.commit()

        # Attempt to transition terminal command
        res2 = client.post("/api/v1/devices/ESP32-P01/ack", json={
            "command_id": test_cmd_id,
            "device_id": "ESP32-P01",
            "status": "EXECUTED",
            "actual_state": "RUNNING"
        })
        assert res2.status_code == 400
        assert "terminal" in res2.json()["detail"].lower()
    finally:
        db.close()


def test_18_physical_feedback_verification_semantics():
    """Verify that without actuator actual_state feedback, status remains ACKNOWLEDGED with unverified note."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}
    test_cmd_id = f"CMD-UNVERIF-{uuid.uuid4().hex[:8].upper()}"

    # Issue command
    res1 = client.post("/api/v1/devices/ESP32-P01/commands", headers=headers, json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P01",
        "action": "START",
        "expires_in_seconds": 300
    })
    assert res1.status_code == 201

    # ACK claiming EXECUTED but without actual physical actuator feedback
    res2 = client.post("/api/v1/devices/ESP32-P01/ack", json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P01",
        "status": "EXECUTED",
        "actual_state": None
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["current_status"] == "ACKNOWLEDGED"

    db = SessionLocal()
    try:
        cmd = db.query(DeviceCommand).filter(DeviceCommand.command_id == test_cmd_id).first()
        assert cmd.status == "ACKNOWLEDGED"
        assert "unverified" in (cmd.error_message or "").lower()

        # Now report actual physical actuator feedback (e.g. RUNNING state confirmed)
        res3 = client.post("/api/v1/devices/ESP32-P01/ack", json={
            "command_id": test_cmd_id,
            "device_id": "ESP32-P01",
            "status": "EXECUTED",
            "actual_state": "RUNNING"
        })
        assert res3.status_code == 200
        assert res3.json()["current_status"] == "EXECUTED"

        db.refresh(cmd)
        assert cmd.status == "EXECUTED"
        assert cmd.completed_at is not None
    finally:
        db.close()


def test_19_duplicate_execution_prevention():
    """Verify duplicate acknowledgments for an executed command are idempotent and cannot be reverted."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}
    test_cmd_id = f"CMD-IDEM-EXEC-{uuid.uuid4().hex[:8].upper()}"

    client.post("/api/v1/devices/ESP32-P01/commands", headers=headers, json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P01",
        "action": "START",
        "expires_in_seconds": 300
    })

    # Execute command with physical confirmation
    res1 = client.post("/api/v1/devices/ESP32-P01/ack", json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P01",
        "status": "EXECUTED",
        "actual_state": "RUNNING"
    })
    assert res1.status_code == 200
    orig_completed = res1.json()["completed_at"]

    # Duplicate acknowledgment received
    res2 = client.post("/api/v1/devices/ESP32-P01/ack", json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P01",
        "status": "EXECUTED",
        "actual_state": "RUNNING"
    })
    assert res2.status_code == 200
    assert res2.json()["completed_at"] == orig_completed

    # Attempt to revert executed command to FAILED
    res3 = client.post("/api/v1/devices/ESP32-P01/ack", json={
        "command_id": test_cmd_id,
        "device_id": "ESP32-P01",
        "status": "FAILED"
    })
    assert res3.status_code == 400
    assert "cannot transition" in res3.json()["detail"].lower()


def test_20_durable_notification_deduplication_across_restart():
    """Verify notification deduplication survives memory cache clear while alert is active."""
    db = SessionLocal()
    test_device = "GW-DURABLE-TEST"
    try:
        # Create active alert
        alert = create_or_deduplicate_alert(
            db=db,
            pond_id=None,
            device_id=test_device,
            alert_type="GATEWAY_OFFLINE",
            severity="WARNING",
            title=f"Outage on {test_device}",
            description="Outage detected"
        )
        assert alert is not None

        # Send initial notification
        n1 = notification_service.send_notification(
            db=db,
            pond_id=None,
            device_id=test_device,
            condition_detected="GATEWAY_OFFLINE",
            severity="WARNING",
            title=f"Outage on {test_device}",
            message="Outage message"
        )
        assert n1 is not None

        # Clear in-memory hash cache (simulate process restart)
        notification_service._recent_hashes.clear()
        assert len(notification_service._recent_hashes) == 0

        # Attempt duplicate notification while alert is active in database
        n2 = notification_service.send_notification(
            db=db,
            pond_id=None,
            device_id=test_device,
            condition_detected="GATEWAY_OFFLINE",
            severity="WARNING",
            title=f"Outage on {test_device}",
            message="Duplicate outage message"
        )
        assert n2 is None, "Duplicate notification must be durably suppressed across restarts while alert is active"

        # Resolve alert
        resolve_alert_by_type(db=db, pond_id=None, device_id=test_device, alert_type="GATEWAY_OFFLINE")
        notification_service.clear_dedup_hash(pond_id=None, condition_detected="GATEWAY_OFFLINE", device_id=test_device)

        # Genuine new occurrence after resolution delivers a fresh notification
        n3 = notification_service.send_notification(
            db=db,
            pond_id=None,
            device_id=test_device,
            condition_detected="GATEWAY_OFFLINE",
            severity="WARNING",
            title=f"Outage on {test_device} (Second Occurrence)",
            message="Second outage message"
        )
        assert n3 is not None, "Genuine new occurrence after alert resolution must deliver notification"
    finally:
        resolve_alert_by_type(db=db, pond_id=None, device_id=test_device, alert_type="GATEWAY_OFFLINE")
        db.close()


def test_21_critical_ammonia_blocks_remote_feeding():
    """Verify local edge safety supremacy blocks remote feeding commands when toxic ammonia is acute."""
    token = get_auth_token("operator")
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        # Set high TAN/ammonia and high pH on Pond 4 to create toxic NH3 > 0.05 mg/L
        tan_sensor = db.query(Sensor).filter(Sensor.pond_id == 4, Sensor.sensor_type.in_(["ammonia", "tan"])).first()
        ph_sensor = db.query(Sensor).filter(Sensor.pond_id == 4, Sensor.sensor_type == "ph").first()
        temp_sensor = db.query(Sensor).filter(Sensor.pond_id == 4, Sensor.sensor_type == "temperature").first()
        
        orig_tan = tan_sensor.current_value if tan_sensor else 0.04
        orig_ph = ph_sensor.current_value if ph_sensor else 7.9
        orig_temp = temp_sensor.current_value if temp_sensor else 28.5

        if tan_sensor:
            tan_sensor.current_value = 2.5
        if ph_sensor:
            ph_sensor.current_value = 8.8
        if temp_sensor:
            temp_sensor.current_value = 32.0
        db.commit()

        # Attempt remote feed command
        res = client.post("/api/v1/cloud/remote-command", headers=headers, json={
            "pond_id": 4,
            "device_id": "FEEDER-P04",
            "equipment_type": "FEEDER",
            "action": "DISPENSE",
            "ttl_seconds": 60,
            "confirmed_by_user": True
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["status"] == "REJECTED_LOCAL_SAFETY_HOLD"
        assert "ammonia" in data["rejection_reason"].lower()

        # Restore original values
        if tan_sensor:
            tan_sensor.current_value = orig_tan
        if ph_sensor:
            ph_sensor.current_value = orig_ph
        if temp_sensor:
            temp_sensor.current_value = orig_temp
        db.commit()
    finally:
        db.close()
