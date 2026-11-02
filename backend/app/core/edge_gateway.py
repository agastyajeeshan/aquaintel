"""
AquaIntel Edge Gateway & Hybrid Controller Core Service
Manages physical farm edge runtime, offline-first local buffering,
deterministic local safety execution, authenticated remote command processing,
and bi-directional idempotent cloud synchronization.
"""

import time
import math
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from ..models import (
    FarmGateway, EdgeSyncBatch, RemoteCommandRecord, EdgeTelemetryBuffer,
    Pond, Sensor, SensorReading, Aerator, Feeder,
    AutomationSafetyConfig, AutonomousDecisionEvent, AutonomousActionRecord
)
from .hal import hal
from .autonomous_engine import autonomous_engine, sanitize_for_json
from .notification_service import notification_service

class EdgeGatewayService:
    """
    Central industrial edge controller manager for AquaIntel farms.
    Coordinates local edge autonomous safety, offline data buffering,
    remote command dispatch, and secure cloud resynchronization.
    """

    def __init__(self):
        self._gateway_id: str = "GW-NELLORE-DELTA-01"
        self._is_connected: bool = True
        self._last_heartbeat_at: datetime = datetime.now(timezone.utc)
        self._heartbeat_interval_sec: int = 5
        self._local_buffer: List[Dict[str, Any]] = []  # in-memory fast queue mirror
        self._simulated_packet_loss: float = 0.0

    @property
    def is_connected(self) -> bool:
        return self._is_connected

    def set_connectivity(self, connected: bool, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Toggles edge gateway internet uplink connectivity state.
        Dispatches farmer notifications for disconnect and reconnect events.
        """
        prev_state = self._is_connected
        self._is_connected = connected
        hal.set_cloud_connected(connected)
        now_dt = datetime.now(timezone.utc)

        if db:
            gw = db.query(FarmGateway).filter(FarmGateway.gateway_id == self._gateway_id).first()
            if gw:
                gw.status = "ONLINE" if connected else "OFFLINE"
                if connected:
                    gw.connected_at = now_dt
                else:
                    gw.disconnected_at = now_dt
                db.commit()

            # Dispatch notification
            if prev_state and not connected:
                # Connection Lost
                notification_service.send_notification(
                    db=db,
                    pond_id=None,
                    condition_detected="INTERNET_DISCONNECTED",
                    severity="WARNING",
                    title="Edge Gateway Internet Outage — Nellore Delta Facility",
                    message="Internet connectivity lost. Local edge RTU controllers have assumed 100% autonomous operation. Sensors buffering locally; emergency aeration protection active.",
                    automatic_action_taken="ACTIVATE_OFFLINE_EDGE_SAFEGUARDS",
                    action_status="LOCAL_EDGE_ACTIVE",
                    recommended_next_steps="Pond safety is guaranteed by edge controller. Verify farm SIM/fiber uplink if outage persists.",
                    force_escalate=True
                )
            elif not prev_state and connected:
                # Connection Restored
                notification_service.send_notification(
                    db=db,
                    pond_id=None,
                    condition_detected="INTERNET_RECONNECTED",
                    severity="INFO",
                    title="Edge Gateway Cloud Uplink Restored — Nellore Delta",
                    message="Internet connection re-established with central cloud. Edge data spool flushing buffered records idempotently.",
                    automatic_action_taken="INITIATE_IDEMPOTENT_BUFFER_SYNC",
                    action_status="SYNC_IN_PROGRESS",
                    recommended_next_steps="Cloud dashboard telemetry updated to latest live state."
                )

        return {
            "gateway_id": self._gateway_id,
            "is_connected": self._is_connected,
            "status": "ONLINE" if self._is_connected else "OFFLINE",
            "timestamp": now_dt.isoformat()
        }

    def record_heartbeat(self, db: Session, gateway_id: Optional[str] = None) -> FarmGateway:
        """
        Receives edge gateway heartbeat ping, updates latency, battery, and buffer stats.
        """
        gid = gateway_id or self._gateway_id
        gw = db.query(FarmGateway).filter(FarmGateway.gateway_id == gid).first()
        now_dt = datetime.now(timezone.utc)
        self._last_heartbeat_at = now_dt

        if not gw:
            gw = FarmGateway(
                gateway_id=gid,
                farm_id=1,
                name="Nellore Delta Industrial Edge Controller",
                status="ONLINE" if self._is_connected else "OFFLINE",
                last_heartbeat_at=now_dt
            )
            db.add(gw)
        else:
            gw.last_heartbeat_at = now_dt
            gw.status = "ONLINE" if self._is_connected else "OFFLINE"
            # Update buffer count from local table
            un_synced_count = db.query(EdgeTelemetryBuffer).filter(EdgeTelemetryBuffer.is_synced == False).count()
            gw.buffer_count = un_synced_count + len(self._local_buffer)
            gw.local_storage_used_mb = round(42.8 + (gw.buffer_count * 0.002), 2)

        db.commit()
        db.refresh(gw)
        return gw

    def ingest_sensor_reading(
        self,
        db: Session,
        pond_id: int,
        sensor_type: str,
        value: float,
        unit: str,
        timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Ingests a sensor reading from an edge probe (e.g. ESP32 LoRa node).
        Validates locally. If online, stores directly.
        If offline, stores in persistent EdgeTelemetryBuffer queue.
        """
        now_dt = timestamp or datetime.now(timezone.utc)
        record_uuid = f"BUF-{uuid.uuid4().hex[:12].upper()}"

        # 1. Local Edge Physical Sanity Validation
        readings_map = {sensor_type: {"value": value, "timestamp": now_dt, "unit": unit}}
        is_valid, validation_errors = autonomous_engine.validate_sensor_telemetry(readings_map)
        
        if not is_valid:
            return {
                "success": False,
                "reason": "REJECTED_LOCAL_EDGE_VALIDATION: " + "; ".join(validation_errors),
                "buffered": False
            }

        # 2. Check Connection State
        if not self._is_connected:
            # Buffer reading locally on edge gateway
            buf_record = EdgeTelemetryBuffer(
                record_uuid=record_uuid,
                farm_id=1,
                pond_id=pond_id,
                sensor_type=sensor_type,
                value=value,
                unit=unit,
                timestamp=now_dt,
                is_synced=False
            )
            db.add(buf_record)
            db.commit()
            
            # Update gateway buffer counter
            gw = db.query(FarmGateway).filter(FarmGateway.gateway_id == self._gateway_id).first()
            if gw:
                gw.buffer_count = (gw.buffer_count or 0) + 1
                db.commit()

            return {
                "success": True,
                "buffered": True,
                "record_uuid": record_uuid,
                "message": f"Edge offline: Telemetry buffered locally ({sensor_type}: {value} {unit})"
            }

        # 3. Online: Persist to primary sensor readings table and update live sensor
        sensor = db.query(Sensor).filter(Sensor.pond_id == pond_id, Sensor.sensor_type == sensor_type).first()
        if sensor:
            sensor.current_value = value
            sensor.last_reading_at = now_dt
            db.add(SensorReading(
                sensor_id=sensor.id,
                pond_id=sensor.pond_id,
                sensor_type=sensor.sensor_type,
                value=value,
                unit=sensor.unit or unit,
                status="NORMAL",
                is_simulated=False,
                timestamp=now_dt
            ))
            db.commit()

        return {
            "success": True,
            "buffered": False,
            "record_uuid": record_uuid,
            "message": f"Telemetry ingested directly to cloud ({sensor_type}: {value} {unit})"
        }

    def process_remote_command(
        self,
        db: Session,
        command_id: str,
        pond_id: int,
        device_id: str,
        equipment_type: str,
        action: str,
        parameters: Optional[Dict[str, Any]] = None,
        issued_by: str = "Dr. K. Srinivas (Agritech Director)",
        role: str = "FARM_MANAGER",
        ttl_seconds: int = 120
    ) -> Tuple[bool, str, RemoteCommandRecord]:
        """
        Processes an authenticated remote command from cloud application:
        1. Checks Command TTL Expiry.
        2. Enforces Local Safety Hold: Remote manual commands CANNOT override local emergency safety protection.
        3. Dispatches command via HAL with motor feedback tracking.
        """
        now_dt = datetime.now(timezone.utc)
        expires_at = now_dt + timedelta(seconds=ttl_seconds)
        parameters = parameters or {}

        # 1. Create or retrieve remote command record
        cmd_rec = db.query(RemoteCommandRecord).filter(RemoteCommandRecord.command_id == command_id).first()
        if not cmd_rec:
            cmd_rec = RemoteCommandRecord(
                command_id=command_id,
                farm_id=1,
                pond_id=pond_id,
                device_id=device_id,
                equipment_type=equipment_type,
                action=action,
                parameters=parameters,
                status="QUEUED",
                issued_by_user=issued_by,
                user_role=role,
                issued_at=now_dt,
                expires_at=expires_at,
                ttl_seconds=ttl_seconds
            )
            db.add(cmd_rec)
            db.commit()
            db.refresh(cmd_rec)

        # 2. Check Internet Connectivity to Edge Gateway
        if not self._is_connected:
            cmd_rec.status = "QUEUED"
            cmd_rec.rejection_reason = "Edge gateway is offline. Command queued pending reconnection (TTL remaining)."
            db.commit()
            return False, "Gateway is currently offline. Command queued on cloud.", cmd_rec

        # 3. Check Command Expiry
        if now_dt > cmd_rec.expires_at.replace(tzinfo=timezone.utc):
            cmd_rec.status = "EXPIRED"
            cmd_rec.rejection_reason = f"Command exceeded TTL of {ttl_seconds}s before edge delivery."
            db.commit()
            return False, "Command has expired and was discarded by edge gateway.", cmd_rec

        cmd_rec.delivered_to_edge_at = now_dt

        # 4. CRITICAL SAFETY GATE: Enforce Local Safety Supremacy Rule
        # Remote commands must NEVER override local emergency biological protection!
        pond_sensors = db.query(Sensor).filter(Sensor.pond_id == pond_id).all()
        telemetry = {s.sensor_type: s.current_value for s in pond_sensors}
        current_do = telemetry.get("do", 6.2)
        current_temp = telemetry.get("temperature", 28.5)
        current_tan = telemetry.get("tan") if telemetry.get("tan") is not None else telemetry.get("ammonia", 0.04)
        current_ph = telemetry.get("ph", 7.9)
        un_ionized_nh3 = autonomous_engine.calculate_unionized_ammonia(current_tan, current_temp, current_ph)

        # Rule A: If pond is in emergency hypoxia (DO < 3.8 mg/L), prohibit remote STOP of aerators!
        if current_do < 3.8 and equipment_type in ["AERATOR", "BACKUP_AERATOR"] and action in ["STOP", "STANDBY", "OFF"]:
            reason = f"LOCAL EDGE SAFETY HOLD: Cannot shut off aerators. Pond 0{pond_id} is in critical hypoxia (DO {current_do} mg/L < 3.8 mg/L limit)."
            cmd_rec.status = "REJECTED_LOCAL_SAFETY_HOLD"
            cmd_rec.rejection_reason = reason
            db.commit()
            
            notification_service.send_notification(
                db=db,
                pond_id=pond_id,
                condition_detected="REMOTE_COMMAND_REJECTED",
                severity="WARNING",
                title=f"Unsafe Remote Command Blocked — Pond 0{pond_id}",
                message=reason,
                actual_reading=current_do,
                unit="mg/L",
                configured_threshold=3.8,
                automatic_action_taken="HOLD_FAILSAFE_AERATION",
                action_status="BLOCKED_BY_SAFETY",
                recommended_next_steps="Aeration must continue until DO exceeds 5.5 mg/L."
            )
            return False, reason, cmd_rec

        # Rule B: If toxic ammonia is acute (NH3 > 0.05 mg/L), prohibit remote feed dispensation!
        if un_ionized_nh3 > 0.05 and equipment_type == "FEEDER" and action in ["START", "DISPENSE", "FEED"]:
            reason = f"LOCAL EDGE SAFETY HOLD: Cannot dispense feed. Pond 0{pond_id} toxic un-ionized ammonia (NH3) is {un_ionized_nh3} mg/L (> 0.05 mg/L toxicity ceiling)."
            cmd_rec.status = "REJECTED_LOCAL_SAFETY_HOLD"
            cmd_rec.rejection_reason = reason
            db.commit()
            return False, reason, cmd_rec

        # 5. Dispatch Command via Hardware Abstraction Layer
        success, msg, act_rec = hal.dispatch_command(
            db=db,
            pond_id=pond_id,
            equipment_type=equipment_type,
            equipment_code=device_id,
            action=action,
            params={"reason": f"Remote command authorized by {issued_by} ({role})", **parameters}
        )

        if not success:
            if act_rec and act_rec.equipment_ack_status == "MOTOR_FAULT_TRIPPED":
                cmd_rec.status = "MOTOR_FAULT_TRIPPED"
                cmd_rec.equipment_feedback = "TRIPPED"
                cmd_rec.rejection_reason = msg
            else:
                cmd_rec.status = "REJECTED_LOCAL_SAFETY_HOLD"
                cmd_rec.rejection_reason = msg
            db.commit()
            return False, msg, cmd_rec

        # 6. Success Execution
        cmd_rec.status = "EXECUTED_ACK"
        cmd_rec.executed_at = datetime.now(timezone.utc)
        cmd_rec.equipment_feedback = "RUNNING" if action in ["START", "BOOST", "CASCADE_ALL"] else "STANDBY"
        db.commit()

        # Audit notification
        notification_service.send_notification(
            db=db,
            pond_id=pond_id,
            condition_detected="REMOTE_COMMAND_EXECUTED",
            severity="INFO",
            title=f"Remote Command Confirmed — Pond 0{pond_id} {device_id}",
            message=f"Remote action '{action}' on {device_id} successfully executed and acknowledged by edge controller.",
            automatic_action_taken=f"REMOTE_EXECUTE_{action}",
            action_status="EXECUTED",
            recommended_next_steps="Equipment feedback verified via relay acknowledgement."
        )

        return True, f"Remote command {action} successfully executed by edge gateway.", cmd_rec

    def flush_and_sync_buffer(self, db: Session) -> Dict[str, Any]:
        """
        Idempotently flushes all buffered edge telemetry to the cloud database.
        Computes SHA-256 hash to prevent duplicate insertions upon connection flapping.
        """
        buffered_records = db.query(EdgeTelemetryBuffer).filter(EdgeTelemetryBuffer.is_synced == False).all()
        if not buffered_records:
            return {
                "synced_count": 0,
                "status": "NO_BUFFERED_DATA",
                "message": "No pending offline records in edge buffer."
            }

        start_time = time.time()
        batch_id = f"SYNC-BATCH-{uuid.uuid4().hex[:10].upper()}"
        
        # Calculate Idempotency Hash from record UUIDs
        hash_input = "".join(sorted([r.record_uuid for r in buffered_records])).encode('utf-8')
        idempotency_hash = hashlib.sha256(hash_input).hexdigest()

        # Check for duplicate batch
        existing_batch = db.query(EdgeSyncBatch).filter(EdgeSyncBatch.idempotency_hash == idempotency_hash).first()
        if existing_batch:
            # Already synced, mark records synced and return
            for r in buffered_records:
                r.is_synced = True
                r.synced_batch_id = existing_batch.batch_id
            db.commit()
            return {
                "synced_count": len(buffered_records),
                "status": "DUPLICATE_SKIPPED",
                "batch_id": existing_batch.batch_id,
                "message": "Duplicate batch detected and reconciled safely without re-inserting."
            }

        # Apply buffered records to live sensors and telemetry history
        synced_count = 0
        for r in buffered_records:
            sensor = db.query(Sensor).filter(Sensor.pond_id == r.pond_id, Sensor.sensor_type == r.sensor_type).first()
            if sensor:
                # Update current reading if newer than sensor last_reading_at
                sensor_dt = sensor.last_reading_at.replace(tzinfo=timezone.utc) if sensor.last_reading_at and sensor.last_reading_at.tzinfo is None else (sensor.last_reading_at or datetime.min.replace(tzinfo=timezone.utc))
                record_dt = r.timestamp.replace(tzinfo=timezone.utc) if r.timestamp.tzinfo is None else r.timestamp
                if record_dt >= sensor_dt:
                    sensor.current_value = r.value
                    sensor.last_reading_at = r.timestamp

                db.add(SensorReading(
                    sensor_id=sensor.id,
                    pond_id=sensor.pond_id,
                    sensor_type=sensor.sensor_type,
                    value=r.value,
                    unit=sensor.unit or "mg/L",
                    status="NORMAL",
                    is_simulated=False,
                    timestamp=r.timestamp
                ))
            r.is_synced = True
            r.synced_batch_id = batch_id
            synced_count += 1

        duration_ms = int((time.time() - start_time) * 1000)

        # Log Sync Batch
        sync_batch = EdgeSyncBatch(
            batch_id=batch_id,
            gateway_id=self._gateway_id,
            farm_id=1,
            record_type="TELEMETRY",
            record_count=synced_count,
            synced_at=datetime.now(timezone.utc),
            duration_ms=max(15, duration_ms),
            status="SUCCESS",
            idempotency_hash=idempotency_hash
        )
        db.add(sync_batch)

        # Update Gateway status
        gw = db.query(FarmGateway).filter(FarmGateway.gateway_id == self._gateway_id).first()
        if gw:
            gw.buffer_count = 0
            gw.status = "ONLINE"
            gw.connected_at = datetime.now(timezone.utc)

        db.commit()

        return {
            "batch_id": batch_id,
            "synced_count": synced_count,
            "duration_ms": max(15, duration_ms),
            "status": "SUCCESS",
            "message": f"Successfully flushed and synchronized {synced_count} buffered edge readings to cloud."
        }

    def get_status_overview(self, db: Session) -> Dict[str, Any]:
        """
        Returns full edge-cloud hybrid health, gateway heartbeat, sync stats,
        and recent remote commands.
        """
        gw = db.query(FarmGateway).filter(FarmGateway.gateway_id == self._gateway_id).first()
        un_synced_count = db.query(EdgeTelemetryBuffer).filter(EdgeTelemetryBuffer.is_synced == False).count()
        recent_commands = db.query(RemoteCommandRecord).order_by(RemoteCommandRecord.issued_at.desc()).limit(10).all()
        recent_batches = db.query(EdgeSyncBatch).order_by(EdgeSyncBatch.synced_at.desc()).limit(5).all()

        now_dt = datetime.now(timezone.utc)
        last_hb = gw.last_heartbeat_at.replace(tzinfo=timezone.utc) if gw and gw.last_heartbeat_at and gw.last_heartbeat_at.tzinfo is None else (gw.last_heartbeat_at if gw else now_dt)
        seconds_since_hb = int((now_dt - last_hb).total_seconds()) if last_hb else 0

        return {
            "gateway_id": self._gateway_id,
            "status": "ONLINE" if self._is_connected else "OFFLINE",
            "is_connected": self._is_connected,
            "hardware_model": gw.hardware_model if gw else "Advantech UNO-2271G / CM4",
            "firmware_version": gw.firmware_version if gw else "v3.2.0-edge-hybrid",
            "ip_address": gw.ip_address if gw else "192.168.1.1",
            "mac_address": gw.mac_address if gw else "B8:27:EB:4A:89:12",
            "lora_channel": "865.2 MHz (IN865 ISM Sub-GHz Band)",
            "last_heartbeat_seconds_ago": seconds_since_hb,
            "buffer_count": un_synced_count,
            "local_storage_used_mb": gw.local_storage_used_mb if gw else 42.8,
            "local_edge_safety_active": True,
            "recent_commands": [
                {
                    "command_id": c.command_id,
                    "pond_id": c.pond_id,
                    "device_id": c.device_id,
                    "action": c.action,
                    "status": c.status,
                    "issued_by_user": c.issued_by_user,
                    "user_role": c.user_role,
                    "issued_at": c.issued_at.isoformat() if c.issued_at else None,
                    "expires_at": c.expires_at.isoformat() if c.expires_at else None,
                    "executed_at": c.executed_at.isoformat() if c.executed_at else None,
                    "rejection_reason": c.rejection_reason
                }
                for c in recent_commands
            ],
            "recent_sync_batches": [
                {
                    "batch_id": b.batch_id,
                    "record_type": b.record_type,
                    "record_count": b.record_count,
                    "status": b.status,
                    "duration_ms": b.duration_ms,
                    "synced_at": b.synced_at.isoformat() if b.synced_at else None
                }
                for b in recent_batches
            ]
        }

# Global Singleton Edge Gateway Service
edge_gateway = EdgeGatewayService()
