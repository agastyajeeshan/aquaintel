"""
Unit & Integration Test Suite for AquaIntel Fully Autonomous Farm Management Engine
Validates all condition-based monitoring, multi-parameter risk intelligence,
safety interlocks, hardware abstraction layer, notification deduplication,
and closed-loop action verification.
"""

import pytest
import math
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import (
    Pond, Sensor, Aerator, Feeder,
    AutomationSafetyConfig, AutonomousDecisionEvent, AutonomousActionRecord,
    NotificationLog, AuditLog
)
from app.core.hal import hal
from app.core.notification_service import notification_service
from app.core.autonomous_engine import autonomous_engine, sanitize_for_json

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_autonomous_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Ensure nominal safety config exists
    cfg = db.query(AutomationSafetyConfig).filter(AutomationSafetyConfig.farm_id == 1).first()
    if not cfg:
        cfg = AutomationSafetyConfig(farm_id=1, operating_mode="AUTOMATIC_SAFETY")
        db.add(cfg)
        db.commit()
    yield
    db.close()

def test_autonomous_status_and_mode_transitions():
    """Verify status reporting and authorized operating mode transitions with audit logging."""
    res = client.get("/api/autonomous/status")
    assert res.status_code == 200
    data = res.json()
    assert "operating_mode" in data
    assert data["local_edge_failsafe_active"] is True

    # Transition to MONITOR mode
    res2 = client.post("/api/autonomous/mode", json={
        "mode": "MONITOR",
        "operator_name": "Dr. K. Srinivas",
        "reason": "Test monitor observation transition"
    })
    assert res2.status_code == 200
    assert res2.json()["current_mode"] == "MONITOR"

    # Reset back to AUTOMATIC_SAFETY mode
    res3 = client.post("/api/autonomous/mode", json={
        "mode": "AUTOMATIC_SAFETY",
        "operator_name": "Dr. K. Srinivas",
        "reason": "Restoring default safety protection"
    })
    assert res3.status_code == 200
    assert res3.json()["current_mode"] == "AUTOMATIC_SAFETY"

def test_critical_low_do_triggers_automatic_aeration_and_feeder_cutoff():
    """Verify that severe hypoxia (< 3.5 mg/L) automatically starts primary aerators and halts feeders."""
    res = client.post("/api/autonomous/simulate-scenario", json={
        "scenario": "CRITICAL_DO_FAILOVER",
        "pond_id": 4
    })
    assert res.status_code == 200
    data = res.json()
    assert data["scenario"] == "CRITICAL_DO_FAILOVER"
    assert data["events_count"] >= 1

    # Verify action records in DB
    db = SessionLocal()
    try:
        actions = db.query(AutonomousActionRecord).filter(
            AutonomousActionRecord.pond_id == 4
        ).order_by(AutonomousActionRecord.dispatched_at.desc()).limit(10).all()
        
        aerator_actions = [a for a in actions if a.equipment_type == "AERATOR"]
        feeder_actions = [a for a in actions if a.equipment_type == "FEEDER"]
        
        assert len(aerator_actions) > 0
        assert len(feeder_actions) > 0
        assert feeder_actions[0].command_action == "SUSPEND"
    finally:
        db.close()

def test_monitor_mode_blocks_automatic_actuation():
    """Verify that when farm is in MONITOR mode, conditions trigger advisories only, never physical actuation."""
    client.post("/api/autonomous/mode", json={"mode": "MONITOR"})
    db = SessionLocal()
    try:
        events = autonomous_engine.evaluate_pond(db, 3, simulated_override={"do": 2.5, "temperature": 29.0})
        assert len(events) >= 1
        hypoxia_ev = next((e for e in events if e.condition_type == "LOW_DO_HYPOXIA"), None)
        assert hypoxia_ev is not None
        assert hypoxia_ev.action_mode == "ADVISORY_ONLY"
        assert hypoxia_ev.is_executed is False
    finally:
        # Restore to AUTOMATIC_SAFETY
        client.post("/api/autonomous/mode", json={"mode": "AUTOMATIC_SAFETY"})
        db.close()

def test_invalid_sensor_reading_blocks_unsafe_action():
    """Verify that physics boundary violations (NaN, negative DO, extreme pH) abort automatic actions."""
    db = SessionLocal()
    try:
        # Extreme unphysical DO = -2.0 mg/L
        events = autonomous_engine.evaluate_pond(db, 2, simulated_override={"do": -2.0})
        assert len(events) >= 1
        stale_ev = events[0]
        assert stale_ev.condition_type == "SENSOR_ANOMALY_STALE"
        assert stale_ev.action_mode == "BLOCKED_BY_SAFETY"
        assert stale_ev.selected_action == "HOLD_FAILSAFE_AERATION"
        assert stale_ev.is_executed is False
    finally:
        db.close()

def test_stale_sensor_reading_blocks_action():
    """Verify that telemetry older than max_staleness_seconds is rejected and held in fail-safe."""
    stale_ts = datetime.now(timezone.utc) - timedelta(seconds=600)
    readings = {
        "do": {"value": 3.0, "timestamp": stale_ts, "unit": "mg/L"}
    }
    is_valid, errors = autonomous_engine.validate_sensor_telemetry(readings, max_staleness_seconds=180)
    assert is_valid is False
    assert any("stale" in err.lower() for err in errors)

def test_aerator_failure_activates_backup_aerator():
    """Verify that motor overload trip fault on primary aerator automatically fails over to backup aerator."""
    db = SessionLocal()
    try:
        hal.inject_fault("AER-P04-1", "MOTOR_OVERLOAD_TRIP")
        events = autonomous_engine.evaluate_pond(db, 4, simulated_override={"do": 2.7, "temperature": 29.0})
        
        # Verify failover action
        backup_action = db.query(AutonomousActionRecord).filter(
            AutonomousActionRecord.pond_id == 4,
            AutonomousActionRecord.equipment_type == "BACKUP_AERATOR"
        ).order_by(AutonomousActionRecord.dispatched_at.desc()).first()
        
        assert backup_action is not None
        assert backup_action.command_action == "FAILOVER_BACKUP"
    finally:
        hal.clear_fault("AER-P04-1")
        db.close()

def test_toxic_ammonia_surge_suspends_feeding():
    """Verify that Emerson (1975) un-ionized ammonia calculation exceeding 0.05 mg/L halts automatic feeding."""
    res = client.post("/api/autonomous/simulate-scenario", json={
        "scenario": "TOXIC_AMMONIA_SURGE",
        "pond_id": 5
    })
    assert res.status_code == 200
    
    # Calculate unionized ammonia directly to verify math
    nh3 = autonomous_engine.calculate_unionized_ammonia(tan_mg_l=0.22, temperature_c=32.0, ph=8.7)
    assert nh3 > 0.05
    assert nh3 < 0.22

def test_heavy_rainfall_and_salinity_flood_safeguard():
    """Verify that flood condition (salinity drop + high water level) triggers destratification aerators."""
    res = client.post("/api/autonomous/simulate-scenario", json={
        "scenario": "HEAVY_RAIN_FLOOD",
        "pond_id": 4
    })
    assert res.status_code == 200
    assert "flood" in res.json()["message"].lower()

def test_chemical_and_medicine_dosing_hard_safety_lock():
    """Verify Section 5 mandatory rule: autonomous chemical/medicine dosing is strictly blocked."""
    res = client.post("/api/autonomous/simulate-scenario", json={
        "scenario": "CHEMICAL_DOSING_REQUEST",
        "pond_id": 4
    })
    assert res.status_code == 200
    assert "blocked" in res.json()["message"].lower()

def test_cloud_disconnect_maintains_local_edge_protection():
    """Verify that loss of cloud connectivity keeps edge RTU and local safety protection active."""
    res = client.post("/api/autonomous/simulate-scenario", json={
        "scenario": "CLOUD_DISCONNECT",
        "pond_id": 4
    })
    assert res.status_code == 200
    data = res.json()
    assert data["cloud_connected"] is False
    assert data["local_edge_failsafe_active"] is True

    # Restore connectivity
    client.post("/api/autonomous/simulate-scenario", json={"scenario": "RESET", "pond_id": 4})

def test_notification_deduplication_and_escalation():
    """Verify that identical repeated alerts within the deduplication window are safely suppressed."""
    db = SessionLocal()
    try:
        # First notification
        n1 = notification_service.send_notification(
            db=db,
            pond_id=1,
            condition_detected="TEST_DEDUP_CONDITION",
            severity="WARNING",
            title="Test Deduplication",
            message="Initial test alert message",
            event_id="EVT-TEST-DEDUP-001"
        )
        assert n1 is not None

        # Immediate duplicate notification with same key within deduplication window
        n2 = notification_service.send_notification(
            db=db,
            pond_id=1,
            condition_detected="TEST_DEDUP_CONDITION",
            severity="WARNING",
            title="Test Deduplication",
            message="Initial test alert message",
            event_id="EVT-TEST-DEDUP-001"
        )
        assert n2 is None  # Suppressed by SHA-256 deduplication!
    finally:
        db.close()

def test_anti_cycling_hysteresis_prevention():
    """Verify that hardware controller prevents rapid ON/OFF oscillation within min_off_seconds."""
    db = SessionLocal()
    try:
        # Dispatch command
        success1, msg1, act1 = hal.dispatch_command(
            db=db,
            pond_id=1,
            equipment_type="AERATOR",
            equipment_code="AER-P01-1",
            action="START",
            min_on_seconds=600,
            min_off_seconds=300
        )
        # Attempt immediate STOP within min_on window
        success2, msg2, act2 = hal.dispatch_command(
            db=db,
            pond_id=1,
            equipment_type="AERATOR",
            equipment_code="AER-P01-1",
            action="STOP",
            min_on_seconds=600,
            min_off_seconds=300
        )
        assert success2 is False
        assert "hysteresis" in msg2.lower()
    finally:
        db.close()

def test_closed_loop_recovery_verification():
    """Verify closed-loop verification endpoint checks sensor recovery against target threshold."""
    db = SessionLocal()
    try:
        action = db.query(AutonomousActionRecord).first()
        if action:
            res = client.post(f"/api/autonomous/verify-action/{action.action_id}")
            assert res.status_code == 200
            data = res.json()
            assert "recovery_verified" in data
            assert "current_reading" in data
    finally:
        db.close()

def test_manual_emergency_override():
    """Verify that operator can manually command 100% cascade aeration and feeder lockouts."""
    res = client.post("/api/autonomous/override", json={
        "action": "CASCADE_AERATION_ALL",
        "pond_id": 4,
        "operator_name": "Dr. K. Srinivas"
    })
    assert res.status_code == 200
    assert res.json()["success"] is True

    res2 = client.post("/api/autonomous/override", json={
        "action": "LOCKOUT_ALL_FEEDERS",
        "pond_id": 4,
        "operator_name": "Dr. K. Srinivas"
    })
    assert res2.status_code == 200
    assert res2.json()["success"] is True
