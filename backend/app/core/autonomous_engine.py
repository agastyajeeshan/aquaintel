"""
Autonomous Intelligent Farm Management Decision Engine
AquaIntel Aquaculture Platform

Continuously ingests multi-sensor telemetry, validates reading integrity,
evaluates multi-parameter risks (Emerson un-ionized ammonia, thermal-DO coupling, flood safeguards),
executes pre-authorized safety actions, orchestrates aerator backup failovers,
dispatches standardized notifications, and executes closed-loop recovery verification.
"""

import math
import uuid
from datetime import datetime, date, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from ..models import (
    Pond, Sensor, SensorReading, Aerator, Feeder,
    AutomationSafetyConfig, AutonomousDecisionEvent, AutonomousActionRecord,
    Alert, WeatherObservation, WeatherForecast
)
from .hal import hal
from .notification_service import notification_service

def sanitize_for_json(obj: Any) -> Any:
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(x) for x in obj]
    return obj

class AutonomousDecisionEngine:
    """
    Central decision engine evaluating multi-parameter farm telemetry
    and enforcing deterministic safety interlocks.
    """

    # Validated Emerson et al. (1975) un-ionized ammonia equilibrium
    @staticmethod
    def calculate_unionized_ammonia(tan_mg_l: float, temperature_c: float, ph: float) -> float:
        """
        Calculates toxic un-ionized ammonia (NH3) from Total Ammonia Nitrogen (TAN).
        Formula:
          pKa = 0.09018 + (2729.92 / (273.15 + temp_c))
          f = 1 / (10^(pKa - pH) + 1)
          NH3 = TAN * f
        """
        if tan_mg_l <= 0 or temperature_c <= 0 or ph <= 0:
            return 0.0
        pka = 0.09018 + (2729.92 / (273.15 + temperature_c))
        fraction = 1.0 / (math.pow(10, pka - ph) + 1.0)
        return round(tan_mg_l * fraction, 4)

    def get_safety_config(self, db: Session, farm_id: int = 1) -> AutomationSafetyConfig:
        config = db.query(AutomationSafetyConfig).filter(AutomationSafetyConfig.farm_id == farm_id).first()
        if not config:
            config = AutomationSafetyConfig(farm_id=farm_id, operating_mode="AUTOMATIC_SAFETY")
            db.add(config)
            db.commit()
            db.refresh(config)
        return config

    def validate_sensor_telemetry(
        self, sensor_readings: Dict[str, Any], max_staleness_seconds: int = 180
    ) -> Tuple[bool, List[str]]:
        """
        Validates telemetry: detects NaN, negative values, extreme physics violations, and stale timestamps.
        """
        rejection_reasons = []
        now_dt = datetime.now(timezone.utc)

        for sensor_type, data in sensor_readings.items():
            val = data.get("value")
            ts = data.get("timestamp")

            # Null / NaN check
            if val is None or (isinstance(val, (int, float)) and math.isnan(val)):
                rejection_reasons.append(f"Sensor {sensor_type} returned invalid null or NaN value.")
                continue

            # Physics boundary checks
            if isinstance(val, (int, float)):
                if sensor_type == "do" and (val < 0.0 or val > 25.0):
                    rejection_reasons.append(f"DO reading {val} mg/L is outside physical marine range (0-25).")
                elif sensor_type == "temperature" and (val < 5.0 or val > 50.0):
                    rejection_reasons.append(f"Temperature reading {val}°C is outside biological range (5-50).")
                elif sensor_type == "ph" and (val < 4.0 or val > 12.0):
                    rejection_reasons.append(f"pH reading {val} is outside sensor electrochemical boundary (4-12).")
                elif sensor_type == "tan" and (val < 0.0 or val > 10.0):
                    rejection_reasons.append(f"TAN reading {val} mg/L is negative or implausibly high.")

            # Staleness check
            if ts:
                parsed_ts = None
                if isinstance(ts, datetime):
                    parsed_ts = ts
                elif isinstance(ts, str):
                    try:
                        parsed_ts = datetime.fromisoformat(ts)
                    except Exception:
                        pass
                if parsed_ts:
                    if parsed_ts.tzinfo is None:
                        parsed_ts = parsed_ts.replace(tzinfo=timezone.utc)
                    age_sec = (now_dt - parsed_ts).total_seconds()
                    if age_sec > max_staleness_seconds:
                        rejection_reasons.append(f"Sensor {sensor_type} reading is stale ({int(age_sec)}s old > {max_staleness_seconds}s limit).")

        is_valid = len(rejection_reasons) == 0
        return is_valid, rejection_reasons

    def evaluate_pond(
        self, db: Session, pond_id: int, simulated_override: Optional[Dict[str, Any]] = None
    ) -> List[AutonomousDecisionEvent]:
        """
        Performs full continuous multi-parameter assessment of a pond,
        evaluates safety interlocks, dispatches actions, and sends notifications.
        """
        config = self.get_safety_config(db)
        pond = db.query(Pond).filter(Pond.id == pond_id).first()
        if not pond:
            return []

        # 1. Gather Latest Pond Telemetry
        sensors = db.query(Sensor).filter(Sensor.pond_id == pond_id).all()
        telemetry: Dict[str, Any] = {}
        now_dt = datetime.now(timezone.utc)

        for s in sensors:
            reading_time = now_dt if simulated_override else (s.last_reading_at or now_dt)
            telemetry[s.sensor_type] = {
                "value": s.current_value,
                "timestamp": reading_time.isoformat() if isinstance(reading_time, datetime) else str(reading_time),
                "unit": s.unit
            }

        # Apply simulated overrides if provided for testing
        if simulated_override:
            for k, v in simulated_override.items():
                if k not in ["request_chemical_dosing", "tray_consumption_pct"]:
                    telemetry[k] = {"value": v, "timestamp": now_dt.isoformat(), "unit": "sim"}

        # 2. Extract key metrics (with nominal fallbacks)
        do_val = telemetry.get("do", {}).get("value", 6.2)
        temp_val = telemetry.get("temperature", {}).get("value", 28.5)
        ph_val = telemetry.get("ph", {}).get("value", 7.9)
        tan_val = telemetry.get("tan", {}).get("value", 0.04)
        sal_val = telemetry.get("salinity", {}).get("value", 20.0)
        water_level_m = telemetry.get("water_level", {}).get("value", 1.22)
        tray_resp = simulated_override.get("tray_consumption_pct", 85.0) if simulated_override else 85.0

        # Latest Weather Context
        weather = db.query(WeatherObservation).order_by(WeatherObservation.timestamp.desc()).first()
        rainfall_mm = weather.rainfall_mm if weather else 0.0

        # 3. Sensor Sanity & Staleness Validation
        is_sensor_valid, validation_errors = self.validate_sensor_telemetry(telemetry)
        if not is_sensor_valid:
            # Block automated actuations on bad sensor data; hold fail-safe aeration and notify
            event_id = f"EVT-STALE-{uuid.uuid4().hex[:8].upper()}"
            rationale = "Sensor reading rejection: " + "; ".join(validation_errors)
            
            event = AutonomousDecisionEvent(
                event_id=event_id,
                pond_id=pond_id,
                severity="WARNING",
                condition_type="SENSOR_ANOMALY_STALE",
                title=f"Sensor Anomaly / Staleness Detected on Pond 0{pond_id}",
                trigger_parameters=sanitize_for_json(telemetry),
                multi_parameter_analysis={"validation_errors": validation_errors},
                weather_context={"rainfall_mm": rainfall_mm},
                decision_rationale=rationale,
                selected_action="HOLD_FAILSAFE_AERATION",
                action_mode="BLOCKED_BY_SAFETY",
                is_executed=False,
                status="ACTION_EXECUTED",
                created_at=now_dt
            )
            db.add(event)
            db.commit()

            notification_service.send_notification(
                db=db,
                pond_id=pond_id,
                condition_detected="SENSOR_ANOMALY_STALE",
                severity="WARNING",
                title=f"Sensor Reliability Warning — Pond 0{pond_id}",
                message=rationale,
                automatic_action_taken="HOLD_FAILSAFE_AERATION (Automated changes blocked)",
                action_status="BLOCKED_BY_SAFETY",
                recommended_next_steps="Inspect sensor cabling, clean optical probe cap, verify battery level.",
                event_id=event_id
            )
            return [event]

        # 4. Multi-Parameter Chemical Calculations
        nh3_val = self.calculate_unionized_ammonia(tan_val, temp_val, ph_val)

        generated_events: List[AutonomousDecisionEvent] = []

        # =========================================================================
        # CONDITION A: CRITICAL LOW DISSOLVED OXYGEN (Hypoxia Emergency)
        # =========================================================================
        if do_val < config.emergency_do_threshold:
            event_id = f"EVT-HYPOXIA-{uuid.uuid4().hex[:8].upper()}"
            severity = "EMERGENCY" if do_val < 3.0 else "CRITICAL"
            rationale = (
                f"DO dropped to {do_val} mg/L (Critical safety threshold: {config.emergency_do_threshold} mg/L). "
                f"Immediate hypoxic mortality risk for L. vannamei. "
                f"Automatic 100% aeration cascade required. Motorized feeding must be halted."
            )
            
            action_mode = "AUTOMATIC" if config.operating_mode in ["AUTOMATIC_SAFETY", "FULL_AUTOMATION"] else "ADVISORY_ONLY"
            is_exec = False
            # Identify primary and backup aerators for this pond
            aerators = db.query(Aerator).filter(Aerator.pond_id == pond_id).all()
            primary_aerators = [a for a in aerators if not a.aerator_code.endswith("-D")]
            backup_aerator = next((a for a in aerators if a.aerator_code.endswith("-D")), None)
            if not backup_aerator and len(aerators) >= 4:
                backup_aerator = aerators[-1]
                primary_aerators = [a for a in aerators if a.id != backup_aerator.id]

            if action_mode == "AUTOMATIC" and config.auto_aeration_enabled:
                # 1. Turn on all primary aerators
                for aer in primary_aerators:
                    success, msg, act_rec = hal.dispatch_command(
                        db=db,
                        pond_id=pond_id,
                        equipment_type="AERATOR",
                        equipment_code=aer.aerator_code,
                        action="START",
                        params={"reason": "Autonomous Critical Low DO Emergency Cascade", "trigger_do": do_val},
                        min_on_seconds=config.min_on_seconds,
                        min_off_seconds=config.min_off_seconds,
                        decision_event_id=event_id
                    )
                    
                    # 2. Aerator Backup Failover Check: If a primary aerator tripped/failed, failover to backup!
                    if not success and act_rec and act_rec.equipment_ack_status == "MOTOR_FAULT_TRIPPED" and backup_aerator:
                        # Failover to backup
                        b_success, b_msg, b_act = hal.dispatch_command(
                            db=db,
                            pond_id=pond_id,
                            equipment_type="BACKUP_AERATOR",
                            equipment_code=backup_aerator.aerator_code,
                            action="FAILOVER_BACKUP",
                            params={"reason": f"Primary {aer.aerator_code} tripped: {msg}. Failover to backup.", "trigger_do": do_val},
                            min_on_seconds=config.min_on_seconds,
                            min_off_seconds=config.min_off_seconds,
                            decision_event_id=event_id
                        )
                        notification_service.send_notification(
                            db=db,
                            pond_id=pond_id,
                            condition_detected="AERATOR_TRIP_FAILOVER",
                            severity="EMERGENCY",
                            title=f"EMERGENCY AERATOR FAILOVER — Pond 0{pond_id}",
                            message=f"Primary aerator {aer.aerator_code} tripped. Backup aerator {backup_aerator.aerator_code} automatically engaged.",
                            actual_reading=do_val,
                            unit="mg/L",
                            configured_threshold=config.emergency_do_threshold,
                            automatic_action_taken=f"FAILOVER_BACKUP: {backup_aerator.aerator_code}",
                            action_status="FAILOVER_ACTIVE",
                            recommended_next_steps="Dispatch maintenance technician to inspect tripped contactor.",
                            event_id=event_id,
                            force_escalate=True
                        )

                # 3. Interlock: Automatically halt feeding during critical hypoxia
                if config.auto_feeder_cutoff_enabled:
                    feeders = db.query(Feeder).filter(Feeder.pond_id == pond_id).all()
                    for f in feeders:
                        hal.dispatch_command(
                            db=db,
                            pond_id=pond_id,
                            equipment_type="FEEDER",
                            equipment_code=f.feeder_code,
                            action="SUSPEND",
                            params={"reason": f"Emergency feed suspension: DO {do_val} mg/L < {config.emergency_do_threshold}", "trigger_do": do_val},
                            decision_event_id=event_id
                        )

                is_exec = True

            event = AutonomousDecisionEvent(
                event_id=event_id,
                pond_id=pond_id,
                severity=severity,
                condition_type="LOW_DO_HYPOXIA",
                title=f"Critical Hypoxia Alert: DO {do_val} mg/L on Pond 0{pond_id}",
                trigger_parameters={"do_mg_l": do_val, "threshold": config.emergency_do_threshold},
                multi_parameter_analysis={"temperature_c": temp_val, "ph": ph_val},
                weather_context={"rainfall_mm": rainfall_mm},
                decision_rationale=rationale,
                selected_action="CASCADE_ALL_AERATORS_AND_HALT_FEEDING",
                action_mode=action_mode,
                is_executed=is_exec,
                status="ACTION_EXECUTED" if is_exec else "DETECTED",
                created_at=now_dt
            )
            db.add(event)
            db.commit()

            notification_service.send_notification(
                db=db,
                pond_id=pond_id,
                condition_detected="LOW_DO_HYPOXIA",
                severity=severity,
                title=f"CRITICAL HYPOXIA — Pond 0{pond_id} DO {do_val} mg/L",
                message=rationale,
                actual_reading=do_val,
                unit="mg/L",
                configured_threshold=config.emergency_do_threshold,
                automatic_action_taken="CASCADE_ALL_AERATORS_AND_HALT_FEEDING" if is_exec else "ADVISORY_PENDING",
                action_status="EXECUTED" if is_exec else "MANUAL_AUTH_REQUIRED",
                recommended_next_steps="Ensure continuous aeration until DO > 5.5 mg/L. Do not dispense feed.",
                event_id=event_id,
                force_escalate=True
            )
            generated_events.append(event)

        # =========================================================================
        # CONDITION B: UNSAFE FEEDING CONDITIONS (Thermal, Ammonia, or Anorexia)
        # =========================================================================
        unsafe_feed_reasons = []
        if temp_val > config.max_safe_temp_c:
            unsafe_feed_reasons.append(f"Water temperature {temp_val}°C exceeds max safe limit {config.max_safe_temp_c}°C.")
        if tan_val > config.tan_critical_mg_l:
            unsafe_feed_reasons.append(f"Total ammonia {tan_val} mg/L exceeds critical toxicity limit {config.tan_critical_mg_l} mg/L.")
        if nh3_val > config.unionized_nh3_critical_mg_l:
            unsafe_feed_reasons.append(f"Toxic un-ionized NH3 {nh3_val} mg/L exceeds safety ceiling {config.unionized_nh3_critical_mg_l} mg/L.")
        if tray_resp < 30.0:
            unsafe_feed_reasons.append(f"Check-tray feed intake {tray_resp}% indicates severe anorexia / uneaten feed accumulation.")

        if unsafe_feed_reasons and do_val >= config.emergency_do_threshold:
            # (If DO was already emergency, feeding was suspended above)
            event_id = f"EVT-FEED-CUT-{uuid.uuid4().hex[:8].upper()}"
            rationale = "Feeding safety interlock triggered: " + "; ".join(unsafe_feed_reasons)
            action_mode = "AUTOMATIC" if config.operating_mode in ["AUTOMATIC_SAFETY", "FULL_AUTOMATION"] else "ADVISORY_ONLY"
            is_exec = False

            if action_mode == "AUTOMATIC" and config.auto_feeder_cutoff_enabled:
                feeders = db.query(Feeder).filter(Feeder.pond_id == pond_id).all()
                for f in feeders:
                    hal.dispatch_command(
                        db=db,
                        pond_id=pond_id,
                        equipment_type="FEEDER",
                        equipment_code=f.feeder_code,
                        action="SUSPEND",
                        params={"reason": rationale, "trigger_temp": temp_val, "trigger_tan": tan_val},
                        decision_event_id=event_id
                    )
                is_exec = True

            event = AutonomousDecisionEvent(
                event_id=event_id,
                pond_id=pond_id,
                severity="WARNING",
                condition_type="UNSAFE_FEEDING_INTERLOCK",
                title=f"Automatic Feeding Suspension Interlock — Pond 0{pond_id}",
                trigger_parameters={"temperature_c": temp_val, "tan_mg_l": tan_val, "nh3_mg_l": nh3_val, "tray_resp_pct": tray_resp},
                multi_parameter_analysis={"emerson_nh3_mg_l": nh3_val},
                weather_context={"rainfall_mm": rainfall_mm},
                decision_rationale=rationale,
                selected_action="SUSPEND_AUTOMATED_FEEDERS",
                action_mode=action_mode,
                is_executed=is_exec,
                status="ACTION_EXECUTED" if is_exec else "DETECTED",
                created_at=now_dt
            )
            db.add(event)
            db.commit()

            notification_service.send_notification(
                db=db,
                pond_id=pond_id,
                condition_detected="UNSAFE_FEEDING_INTERLOCK",
                severity="WARNING",
                title=f"Feeding Suspended — Pond 0{pond_id}",
                message=rationale,
                actual_reading=temp_val,
                unit="°C",
                configured_threshold=config.max_safe_temp_c,
                automatic_action_taken="SUSPEND_AUTOMATED_FEEDERS" if is_exec else "ADVISORY_PENDING",
                action_status="EXECUTED" if is_exec else "MANUAL_AUTH_REQUIRED",
                recommended_next_steps="Inspect check-tray sediment. Resume feed only after parameters stabilize.",
                event_id=event_id
            )
            generated_events.append(event)

        # =========================================================================
        # CONDITION C: HEAVY RAINFALL / OSMOTIC DILUTION & FLOOD SAFEGUARD
        # =========================================================================
        if (rainfall_mm > 25.0 or water_level_m > config.flood_water_level_m) and sal_val < 15.0:
            event_id = f"EVT-FLOOD-{uuid.uuid4().hex[:8].upper()}"
            rationale = (
                f"Rainfall {rainfall_mm} mm and pond water level {water_level_m} m with salinity drop to {sal_val} ppt. "
                f"High risk of surface freshwater stratification, low hardness, and dike overflow. "
                f"Surface overflow skim valve armed; automatic aeration activated to break thermal/saline stratification."
            )
            action_mode = "AUTOMATIC" if config.operating_mode in ["AUTOMATIC_SAFETY", "FULL_AUTOMATION"] else "ADVISORY_ONLY"
            is_exec = False

            if action_mode == "AUTOMATIC" and config.auto_flood_safeguard_enabled:
                # Aerators break surface rainwater lens
                aerators = db.query(Aerator).filter(Aerator.pond_id == pond_id).limit(2).all()
                for a in aerators:
                    hal.dispatch_command(
                        db=db,
                        pond_id=pond_id,
                        equipment_type="AERATOR",
                        equipment_code=a.aerator_code,
                        action="START",
                        params={"reason": "Break surface stratification during heavy rain", "rainfall_mm": rainfall_mm},
                        decision_event_id=event_id
                    )
                is_exec = True

            event = AutonomousDecisionEvent(
                event_id=event_id,
                pond_id=pond_id,
                severity="WARNING",
                condition_type="HEAVY_RAIN_FLOOD",
                title=f"Heavy Rain & Dilution Safeguard — Pond 0{pond_id}",
                trigger_parameters={"rainfall_mm": rainfall_mm, "water_level_m": water_level_m, "salinity_ppt": sal_val},
                multi_parameter_analysis={"stratification_risk": "HIGH"},
                weather_context={"rainfall_mm": rainfall_mm},
                decision_rationale=rationale,
                selected_action="STRATIFICATION_DESTRATIFY_AERATION_AND_SURFACE_SKIM",
                action_mode=action_mode,
                is_executed=is_exec,
                status="ACTION_EXECUTED" if is_exec else "DETECTED",
                created_at=now_dt
            )
            db.add(event)
            db.commit()

            notification_service.send_notification(
                db=db,
                pond_id=pond_id,
                condition_detected="HEAVY_RAIN_FLOOD",
                severity="WARNING",
                title=f"Heavy Rain Osmotic Shock Safeguard — Pond 0{pond_id}",
                message=rationale,
                actual_reading=rainfall_mm,
                unit="mm",
                configured_threshold=25.0,
                automatic_action_taken="STRATIFICATION_AERATION" if is_exec else "ADVISORY_PENDING",
                action_status="EXECUTED" if is_exec else "MANUAL_AUTH_REQUIRED",
                recommended_next_steps="Apply agricultural limestone/dolomite (CaMg(CO3)2) to buffer total alkalinity.",
                event_id=event_id
            )
            generated_events.append(event)

        # =========================================================================
        # CONDITION D: CHEMICAL / MEDICATION DOSING HARD LOCK ENFORCEMENT
        # =========================================================================
        # If an algorithm or user triggers chemical dosing, enforce hard safety block:
        if simulated_override and simulated_override.get("request_chemical_dosing"):
            event_id = f"EVT-CHEM-BLOCK-{uuid.uuid4().hex[:8].upper()}"
            rationale = (
                "HARD SAFETY RULE VIOLATION: Autonomous chemical, therapeutic, or biological dosing is strictly "
                "prohibited by Section 5 of the Master Governance Specification. Automated dosing without certified "
                "laboratory confirmation and manual veterinary sign-off is blocked."
            )
            event = AutonomousDecisionEvent(
                event_id=event_id,
                pond_id=pond_id,
                severity="ADVISORY",
                condition_type="CHEMICAL_DOSING_BLOCKED",
                title=f"Chemical Dosing Blocked by Safety Lock — Pond 0{pond_id}",
                trigger_parameters={"requested_dosing": simulated_override.get("request_chemical_dosing")},
                multi_parameter_analysis={"safety_lock": "HARD_ENFORCED"},
                weather_context={},
                decision_rationale=rationale,
                selected_action="BLOCK_AUTONOMOUS_CHEMICAL_DOSING",
                action_mode="BLOCKED_BY_SAFETY",
                is_executed=False,
                status="ACTION_EXECUTED",
                created_at=now_dt
            )
            db.add(event)
            db.commit()

            notification_service.send_notification(
                db=db,
                pond_id=pond_id,
                condition_detected="CHEMICAL_DOSING_BLOCKED",
                severity="ADVISORY",
                title=f"Chemical Dosing Blocked — Pond 0{pond_id}",
                message=rationale,
                automatic_action_taken="BLOCK_AUTONOMOUS_CHEMICAL_DOSING",
                action_status="BLOCKED_BY_SAFETY",
                recommended_next_steps="Consult certified aquatic animal health specialist for manual prescription dosing.",
                event_id=event_id
            )
            generated_events.append(event)

        return generated_events

    def run_fleet_evaluation(self, db: Session) -> Dict[str, Any]:
        """
        Executes an autonomous evaluation cycle across all ponds on the farm.
        """
        ponds = db.query(Pond).filter(Pond.is_archived == False).all()
        config = self.get_safety_config(db)
        total_events = []

        for p in ponds:
            events = self.evaluate_pond(db, p.id)
            total_events.extend(events)

        return {
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "operating_mode": config.operating_mode,
            "ponds_evaluated": len(ponds),
            "events_generated_count": len(total_events),
            "cloud_connected": hal.is_cloud_connected(),
            "local_edge_failsafe_active": True
        }

# Global Autonomous Engine Instance
autonomous_engine = AutonomousDecisionEngine()
