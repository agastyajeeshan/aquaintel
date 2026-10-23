import pytest
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure repo root is in python path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.database import engine, Base, SessionLocal
from app.models import Pond, Sensor, Aerator, Feeder
from app.core.control_service import PriorityControlService
from app.core.iot_simulator import iot_simulator
from ai.models.anomaly_detector import WaterQualityAnomalyDetector
from ai.models.disease_model import ExplainableDiseaseRiskModel
from ai.inference.pipeline import AquaIntelInferencePipeline
from iot.simulator.edge_controller import EdgeControllerStateMachine

def test_priority_aeration_critical_hypoxia():
    """Verify Priority 2 critical local rule engages emergency aeration when DO < 3.0 mg/L."""
    db = SessionLocal()
    try:
        # Set pond 1 DO to 2.4 mg/L
        sensor = db.query(Sensor).filter(Sensor.pond_id == 1, Sensor.sensor_type == "do").first()
        sensor.current_value = 2.4
        sensor.last_reading_at = datetime.now(timezone.utc)
        db.commit()

        decision = PriorityControlService.evaluate_pond_aeration(pond_id=1, db=db)
        assert decision["decision"] == "EMERGENCY_RUN"
        assert "2. CRITICAL_WATER_QUALITY_RULE" in decision["priority_applied"]
    finally:
        db.close()

def test_priority_aeration_stale_sensor():
    """Verify Priority 3 stale sensor protection withholds de-escalation when telemetry is old."""
    db = SessionLocal()
    try:
        sensor = db.query(Sensor).filter(Sensor.pond_id == 1, Sensor.sensor_type == "do").first()
        # Set timestamp to 45 minutes ago
        sensor.current_value = 6.8
        sensor.last_reading_at = datetime.now(timezone.utc) - timedelta(minutes=45)
        db.commit()

        decision = PriorityControlService.evaluate_pond_aeration(pond_id=1, db=db)
        assert decision["decision"] == "STALE_SENSOR_FALLBACK"
        assert "3. SENSOR_STALENESS_CHECK" in decision["priority_applied"]
    finally:
        db.close()

def test_priority_feeding_hypoxia_cutoff():
    """Verify Priority 2 critical rule completely halts feeding when DO < 3.2 mg/L."""
    db = SessionLocal()
    try:
        sensor = db.query(Sensor).filter(Sensor.pond_id == 1, Sensor.sensor_type == "do").first()
        sensor.current_value = 2.9
        sensor.last_reading_at = datetime.now(timezone.utc)
        db.commit()

        decision = PriorityControlService.evaluate_pond_feeding(pond_id=1, db=db)
        assert decision["decision"] == "FEEDING_HALTED"
        assert decision["feed_recommended_kg"] == 0.0
    finally:
        db.close()

def test_water_quality_anomaly_detector():
    """Verify anomaly detection on physical out-of-bounds and rapid step jumps."""
    # Out of bounds
    res_oob = WaterQualityAnomalyDetector.evaluate_reading("do", 29.5)
    assert res_oob["is_anomaly"] is True
    assert res_oob["severity"] == "CRITICAL"

    # Rapid step jump
    res_jump = WaterQualityAnomalyDetector.evaluate_reading("do", 3.2, recent_values=[6.5])
    assert res_jump["is_anomaly"] is True
    assert res_jump["severity"] == "WARNING"

    # Frozen telemetry
    res_frozen = WaterQualityAnomalyDetector.evaluate_reading("do", 6.2, recent_values=[6.2, 6.2, 6.2, 6.2, 6.2])
    assert res_frozen["is_anomaly"] is True
    assert res_frozen["anomaly_type"] == "FROZEN_READINGS"

def test_explainable_disease_risk_model():
    """Verify transparent additive stressor points and prominent PCR disclaimer."""
    # WSSV cold stress
    wssv_res = ExplainableDiseaseRiskModel.evaluate_risk(
        disease_key="WSSV",
        do_mg_l=3.5,
        temp_c=25.5,
        ammonia_mg_l=0.03
    )
    assert wssv_res["risk_score"] >= 30.0
    assert any("temperature" in s for s in wssv_res["contributing_stressors"])
    assert "PCR" in wssv_res["metadata"]["clinical_disclaimer"]

def test_edge_controller_offline_state_machine():
    """Verify edge controller local state machine operates without internet and buffers telemetry."""
    controller = EdgeControllerStateMachine(pond_id=1, device_id="ESP32-P01")

    # Critical hypoxia locally
    crit_status = controller.update_cycle(do_reading=2.5, temp_reading=29.0, internet_available=True)
    assert crit_status["current_state"] == "CRITICAL"
    assert crit_status["actuators"]["aerator_relays"] == "ON"
    assert crit_status["actuators"]["feeder_lockout"] == "LOCKED"

    # Internet outage buffering
    offline_status = controller.update_cycle(do_reading=6.0, temp_reading=29.0, internet_available=False)
    assert offline_status["current_state"] == "COMMUNICATION_LOSS"
    assert offline_status["buffered_records_count"] >= 1
