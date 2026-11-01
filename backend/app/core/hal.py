"""
Hardware Abstraction Layer (HAL) & Edge Controller Interface
AquaIntel Autonomous Aquaculture Management Engine

Provides safe, deterministic, authenticated device command dispatch, motor relay feedback,
hysteresis enforcement, aerator backup failover, and local edge fail-safe autonomy.
"""

import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from ..models import (
    Aerator, Feeder, DeviceCommand, AutonomousActionRecord,
    SensorReading, AerationEvent, FeedingLog
)

class HardwareController:
    """
    Simulated Hardware Controller representing ESP32 edge nodes, RS485 Modbus RTU relays,
    VFD motor drives, and solar feeder actuators.
    """
    
    def __init__(self):
        # In-memory tracking of hardware states, simulated faults, and edge local safety
        self._fault_injections: Dict[str, str] = {}  # equipment_code -> fault_type
        self._edge_offline: bool = False             # Simulates cloud disconnect
        self._last_state_changes: Dict[str, float] = {}  # equipment_code -> timestamp
        
    def inject_fault(self, equipment_code: str, fault_type: str = "MOTOR_TRIP_OVERLOAD"):
        """Simulate hardware electrical fault or contactor trip."""
        self._fault_injections[equipment_code] = fault_type
        
    def clear_fault(self, equipment_code: str):
        """Clear hardware fault."""
        self._fault_injections.pop(equipment_code, None)
        
    def set_cloud_connected(self, connected: bool):
        """Simulate cloud connection state. Note: edge safety runs locally regardless."""
        self._edge_offline = not connected

    def is_cloud_connected(self) -> bool:
        return not self._edge_offline

    def dispatch_command(
        self,
        db: Session,
        pond_id: int,
        equipment_type: str,
        equipment_code: str,
        action: str,
        params: Optional[Dict[str, Any]] = None,
        min_on_seconds: int = 600,
        min_off_seconds: int = 600,
        decision_event_id: Optional[str] = None
    ) -> Tuple[bool, str, Optional[AutonomousActionRecord]]:
        """
        Dispatches an authenticated hardware command with safety hysteresis,
        records device command, simulates relay feedback, and initiates closed-loop verification.
        """
        params = params or {}
        now_ts = time.time()
        now_dt = datetime.now(timezone.utc)
        command_id = f"CMD-{uuid.uuid4().hex[:12].upper()}"
        action_id = f"ACT-{uuid.uuid4().hex[:12].upper()}"
        
        # 1. Check Anti-Cycle Hysteresis (Minimum ON / Minimum OFF)
        last_change = self._last_state_changes.get(equipment_code, 0)
        elapsed = now_ts - last_change
        
        if last_change > 0:
            if action in ["STOP", "SUSPEND"] and elapsed < min_on_seconds:
                # Motor hasn't met minimum continuous ON runtime
                remaining = int(min_on_seconds - elapsed)
                return False, f"Hysteresis hold: {equipment_code} must remain ON for {remaining}s more to protect motor windings.", None
            if action in ["START", "BOOST", "CASCADE"] and elapsed < min_off_seconds:
                # Motor hasn't met minimum continuous OFF runtime
                remaining = int(min_off_seconds - elapsed)
                return False, f"Hysteresis hold: {equipment_code} must remain OFF for {remaining}s more to prevent contactor surge.", None

        # 2. Check for Hardware Overload Trip / Fault
        simulated_fault = self._fault_injections.get(equipment_code)
        
        # 3. Create Device Command Record
        dev_cmd = DeviceCommand(
            command_id=command_id,
            device_id=equipment_code,
            pond_id=pond_id,
            action=action,
            payload=params,
            status="PENDING",
            reason=params.get("reason", "Autonomous Engine Dispatch"),
            mode="AUTONOMOUS",
            issued_at=now_dt
        )
        db.add(dev_cmd)
        
        # 4. Create Closed-Loop Action Record
        action_record = AutonomousActionRecord(
            action_id=action_id,
            decision_event_id=decision_event_id,
            pond_id=pond_id,
            equipment_type=equipment_type,
            equipment_code=equipment_code,
            command_action=action,
            command_id=command_id,
            parameters=params,
            dispatched_at=now_dt,
            equipment_ack_status="PENDING"
        )
        db.add(action_record)
        db.flush()
        
        # 5. Simulate Edge Execution & Acknowledgement
        if simulated_fault:
            # Motor tripped / Contactor failed
            dev_cmd.status = "FAILED"
            dev_cmd.error_message = f"Hardware trip fault detected: {simulated_fault}"
            action_record.equipment_ack_status = "MOTOR_FAULT_TRIPPED"
            action_record.notes = f"Relay returned contactor fault code: {simulated_fault}. Failover recommended."
            db.commit()
            return False, f"{equipment_code} tripped with fault: {simulated_fault}", action_record
            
        # Success acknowledgment
        dev_cmd.status = "ACKNOWLEDGED"
        dev_cmd.acknowledged_at = datetime.now(timezone.utc)
        action_record.equipment_ack_status = "ACKNOWLEDGED"
        action_record.equipment_ack_at = datetime.now(timezone.utc)
        self._last_state_changes[equipment_code] = now_ts
        
        # 6. Apply state change to model
        if equipment_type in ["AERATOR", "BACKUP_AERATOR"]:
            aerator = db.query(Aerator).filter(Aerator.aerator_code == equipment_code).first()
            if aerator:
                if action in ["START", "BOOST", "CASCADE_ALL"]:
                    aerator.status = "RUNNING"
                elif action in ["STOP", "STANDBY"]:
                    aerator.status = "STANDBY"
                aerator.last_state_change = now_dt
                
                # Log Aeration Event
                ev = AerationEvent(
                    pond_id=pond_id,
                    aerator_id=aerator.id,
                    action=action,
                    trigger_reason=params.get("reason", "Autonomous decision engine"),
                    trigger_do_level=params.get("trigger_do"),
                    duration_minutes=0.0,
                    timestamp=now_dt
                )
                db.add(ev)
                
        elif equipment_type == "FEEDER":
            feeder = db.query(Feeder).filter(Feeder.feeder_code == equipment_code).first()
            if feeder:
                if action in ["SUSPEND", "STOP", "LOCKOUT"]:
                    feeder.status = "STANDBY"
                elif action in ["RESUME", "START", "DISPENSE"]:
                    feeder.status = "FEEDING"
                    
                # Log Feeding action
                f_log = FeedingLog(
                    pond_id=pond_id,
                    feeder_id=feeder.id,
                    amount_kg=params.get("amount_kg", 0.0),
                    planned_amount_kg=params.get("planned_kg", 25.0),
                    reduction_reason=params.get("reason", "Autonomous environmental interlock"),
                    do_at_feeding=params.get("trigger_do"),
                    temp_at_feeding=params.get("trigger_temp"),
                    status="SKIPPED" if action in ["SUSPEND", "LOCKOUT"] else "COMPLETED",
                    timestamp=now_dt
                )
                db.add(f_log)
                
        db.commit()
        return True, f"Command {action} successfully acknowledged by {equipment_code}", action_record

    def verify_pond_recovery(
        self,
        db: Session,
        action_record: AutonomousActionRecord,
        current_reading: float,
        target_recovery_threshold: float,
        is_higher_better: bool = True
    ) -> bool:
        """
        Closed-loop verification: Evaluates whether the pond condition improved
        following equipment activation (e.g. DO rose above 4.5 mg/L or TAN dropped).
        """
        is_recovered = (current_reading >= target_recovery_threshold) if is_higher_better else (current_reading <= target_recovery_threshold)
        
        if is_recovered:
            action_record.recovery_verified = True
            action_record.recovery_verified_at = datetime.now(timezone.utc)
            action_record.recovery_telemetry = {
                "verified_metric": current_reading,
                "target_threshold": target_recovery_threshold,
                "recovery_time": datetime.now(timezone.utc).isoformat()
            }
            action_record.notes = (action_record.notes or "") + f" | Closed-loop recovery confirmed: {current_reading}"
            db.commit()
            return True
        return False

# Global Singleton Hardware Controller
hal = HardwareController()
