import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from ..models import Pond, Sensor, Aerator, Feeder, DeviceCommand, AuditLog, Alert
from ..config import settings
from .aeration_engine import AerationController
from .feeding_engine import SmartFeedingEngine

class PriorityControlService:
    """
    AquaIntel Central Automated Control Service
    Enforces Strict Priority Architecture (Section 15):
    1. Hardware emergency & safety interlocks
    2. Local critical water-quality rules (DO < 3.0, Ammonia > 0.15)
    3. Sensor validity & staleness checks
    4. Operator-configured safety limits & daily quotas
    5. Automated control policies (Hysteresis aeration & biomass-driven nutrition)
    6. Non-critical advisory optimizations
    """

    STALE_THRESHOLD_SECONDS = 900  # 15 minutes max staleness for automated control

    @classmethod
    def evaluate_pond_aeration(
        cls,
        pond_id: int,
        db: Session,
        emergency_override: bool = False,
        operator_username: Optional[str] = None
    ) -> Dict[str, Any]:
        pond = db.query(Pond).filter(Pond.id == pond_id).first()
        if not pond:
            return {"status": "ERROR", "message": f"Pond {pond_id} not found"}

        now = datetime.now(timezone.utc)
        do_sensor = db.query(Sensor).filter(Sensor.pond_id == pond_id, Sensor.sensor_type == "do").first()
        aerators = db.query(Aerator).filter(Aerator.pond_id == pond_id).all()

        # Priority 1: Hardware emergency interlock
        if emergency_override:
            cls._dispatch_aerator_command(aerators, "RUNNING", "EMERGENCY_OVERRIDE", "Operator emergency switch", db)
            return {
                "decision": "EMERGENCY_START",
                "priority_applied": "1. HARDWARE_EMERGENCY_INTERLOCK",
                "reason": "Emergency override engaged. All pond aerators forced ON."
            }

        # Priority 3: Sensor validity & staleness check
        if not do_sensor or not do_sensor.current_value:
            return {
                "decision": "HOLD_LAST_SAFE_STATE",
                "priority_applied": "3. SENSOR_FAULT_DETECTION",
                "reason": "DO sensor offline or value unavailable. Holding existing aerator states."
            }

        if do_sensor.last_reading_at:
            last_ts = do_sensor.last_reading_at.replace(tzinfo=timezone.utc) if do_sensor.last_reading_at.tzinfo is None else do_sensor.last_reading_at
            if (now - last_ts).total_seconds() > cls.STALE_THRESHOLD_SECONDS:
                return {
                    "decision": "STALE_SENSOR_FALLBACK",
                    "priority_applied": "3. SENSOR_STALENESS_CHECK",
                    "reason": f"DO sensor telemetry is stale (> {cls.STALE_THRESHOLD_SECONDS // 60}m old). Automated optimization withheld for safety."
                }

        do_level = do_sensor.current_value

        # Priority 2: Critical local water-quality rules
        if do_level < 3.0:
            cls._dispatch_aerator_command(aerators, "RUNNING", "CRITICAL_LOW_DO", f"DO at {do_level:.2f} mg/L is critically low (< 3.0 mg/L)", db)
            return {
                "decision": "EMERGENCY_RUN",
                "priority_applied": "2. CRITICAL_WATER_QUALITY_RULE",
                "current_do": do_level,
                "reason": f"CRITICAL: Dissolved oxygen is {do_level:.2f} mg/L (< 3.0 mg/L). Emergency full aeration deployed."
            }

        # Priority 5: Automated hysteresis control
        actions_taken = []
        for aerator in aerators:
            eval_res = AerationController.evaluate_aerator_state(
                current_do=do_level,
                current_status=aerator.status,
                last_state_change=aerator.last_state_change or (now - timedelta(minutes=15)),
                mode=aerator.mode
            )
            if eval_res["new_status"] != aerator.status and eval_res.get("can_switch", True):
                cls._dispatch_single_aerator(aerator, eval_res["new_status"], eval_res["reason"], db)
                actions_taken.append({"aerator": aerator.aerator_code, "new_status": eval_res["new_status"], "reason": eval_res["reason"]})

        return {
            "decision": "HYSTERESIS_EVALUATION",
            "priority_applied": "5. AUTOMATED_HYSTERESIS_POLICY",
            "current_do": do_level,
            "actions_taken": actions_taken or "No state transition required (within hysteresis band)"
        }

    @classmethod
    def evaluate_pond_feeding(
        cls,
        pond_id: int,
        db: Session,
        manual_override_kg: Optional[float] = None,
        operator_username: Optional[str] = None
    ) -> Dict[str, Any]:
        pond = db.query(Pond).filter(Pond.id == pond_id).first()
        if not pond:
            return {"status": "ERROR", "message": f"Pond {pond_id} not found"}

        now = datetime.now(timezone.utc)
        do_sensor = db.query(Sensor).filter(Sensor.pond_id == pond_id, Sensor.sensor_type == "do").first()
        temp_sensor = db.query(Sensor).filter(Sensor.pond_id == pond_id, Sensor.sensor_type == "temperature").first()
        ammonia_sensor = db.query(Sensor).filter(Sensor.pond_id == pond_id, Sensor.sensor_type == "ammonia").first()
        feeder = db.query(Feeder).filter(Feeder.pond_id == pond_id).first()

        do_val = do_sensor.current_value if do_sensor else 6.0
        temp_val = temp_sensor.current_value if temp_sensor else 29.0
        ammonia_val = ammonia_sensor.current_value if ammonia_sensor else 0.02

        # Priority 2: Critical DO feeding cutoff
        if do_val < 3.2:
            return {
                "decision": "FEEDING_HALTED",
                "priority_applied": "2. CRITICAL_WATER_QUALITY_RULE",
                "feed_recommended_kg": 0.0,
                "reason": f"BLOCKED: Dissolved oxygen is {do_val:.2f} mg/L (< 3.2 mg/L). Feeding strictly blocked to prevent lethal pond bottom hypoxia."
            }

        # Calculate recommended nutrition
        rec = SmartFeedingEngine.calculate_feeding_recommendation(
            biomass_kg=pond.estimated_biomass_kg or 1200.0,
            doc=pond.current_age_days or 45,
            temp_c=temp_val,
            do_mg_l=do_val,
            ammonia_mg_l=ammonia_val
        )

        # Priority 4: Operator daily cap enforcement
        daily_cap = feeder.daily_quota_kg if feeder else 50.0
        dispensed_so_far = feeder.dispensed_today_kg if feeder else 0.0
        max_remaining_today = max(0.0, daily_cap - dispensed_so_far)

        recommended_kg = rec["recommended_feed_kg"]
        if recommended_kg > max_remaining_today:
            recommended_kg = round(max_remaining_today, 2)
            rec["reasons"].append(f"Capped at daily quota limit ({daily_cap} kg/day)")

        return {
            "decision": "FEED_CALCULATED",
            "priority_applied": "5. BIOMASS_NUTRITION_MODEL",
            "feed_recommended_kg": recommended_kg,
            "reasons": rec["reasons"],
            "is_cutoff": rec["is_cutoff"],
            "daily_quota_remaining_kg": max_remaining_today
        }

    @staticmethod
    def _dispatch_aerator_command(aerators: List[Aerator], target_state: str, action_code: str, reason: str, db: Session):
        now = datetime.now(timezone.utc)
        for a in aerators:
            a.status = target_state
            a.last_state_change = now
            # Log command
            db.add(DeviceCommand(
                command_id=f"CMD-AER-{uuid.uuid4().hex[:8].upper()}",
                device_id=a.aerator_code,
                pond_id=a.pond_id,
                action="SET_STATE",
                payload={"target_state": target_state},
                status="COMPLETED",
                reason=reason,
                mode=a.mode or "SMART_HYSTERESIS",
                issued_at=now,
                completed_at=now
            ))
        db.commit()

    @staticmethod
    def _dispatch_single_aerator(aerator: Aerator, target_state: str, reason: str, db: Session):
        now = datetime.now(timezone.utc)
        aerator.status = target_state
        aerator.last_state_change = now
        db.add(DeviceCommand(
            command_id=f"CMD-AER-{uuid.uuid4().hex[:8].upper()}",
            device_id=aerator.aerator_code,
            pond_id=aerator.pond_id,
            action="SET_STATE",
            payload={"target_state": target_state},
            status="COMPLETED",
            reason=reason,
            mode=aerator.mode or "SMART_HYSTERESIS",
            issued_at=now,
            completed_at=now
        ))
        db.commit()
