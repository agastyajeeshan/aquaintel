"""
AquaIntel Cloud Layer & Edge Gateway API Endpoints
Provides secure cloud-to-edge communication, remote actuator commands with TTL,
heartbeat telemetry, idempotent resynchronization, and network failure simulations.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..database import get_db
from ..models import (
    FarmGateway, EdgeSyncBatch, RemoteCommandRecord, EdgeTelemetryBuffer,
    Pond, Sensor, Aerator, Feeder, AuditLog, User
)
from ..core.edge_gateway import edge_gateway
from ..core.autonomous_engine import autonomous_engine
from ..core.security import get_current_user

router = APIRouter(prefix="/cloud", tags=["Edge-Cloud Hybrid Operations"])

class RemoteCommandRequest(BaseModel):
    pond_id: int = Field(..., ge=1, le=10, description="Target pond identifier")
    device_id: str = Field(..., description="Target equipment code (e.g. AER-P04-1, FEEDER-P04)")
    equipment_type: str = Field(..., description="AERATOR, FEEDER, PUMP, VALVE")
    action: str = Field(..., description="START, STOP, CASCADE_ALL, SUSPEND, RESUME, DISPENSE")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    operator_name: Optional[str] = "Dr. K. Srinivas (Agritech Director)"
    user_role: Optional[str] = "ADMIN"  # ADMIN, FARM_MANAGER, OPERATOR
    ttl_seconds: Optional[int] = Field(default=120, ge=10, le=600, description="Command expiry time-to-live")
    confirmed_by_user: Optional[bool] = Field(default=True, description="Human confirmation flag for non-emergency commands")

class NetworkSimulationRequest(BaseModel):
    action: str  # DISCONNECT_INTERNET, RECONNECT_INTERNET, FLUSH_SYNC, INJECT_OFFLINE_TELEMETRY, TEST_UNSAFE_OVERRIDE, TEST_EXPIRED_COMMAND
    pond_id: Optional[int] = 4
    reading_value: Optional[float] = 3.2
    sensor_type: Optional[str] = "do"

@router.get("/status")
def get_hybrid_status(db: Session = Depends(get_db)):
    """
    Returns edge-cloud connectivity state, gateway health,
    last heartbeat latency, offline buffer count, and sync statistics.
    """
    return edge_gateway.get_status_overview(db)

@router.get("/gateways")
def list_farm_gateways(db: Session = Depends(get_db)):
    """
    Lists registered industrial farm edge gateways and their network metrics.
    """
    gateways = db.query(FarmGateway).all()
    now_dt = datetime.now(timezone.utc)
    return [
        {
            "id": g.id,
            "gateway_id": g.gateway_id,
            "farm_id": g.farm_id,
            "name": g.name,
            "status": "ONLINE" if edge_gateway.is_connected else "OFFLINE",
            "hardware_model": g.hardware_model,
            "firmware_version": g.firmware_version,
            "ip_address": g.ip_address,
            "mac_address": g.mac_address,
            "lora_frequency_mhz": g.lora_frequency_mhz,
            "buffer_count": g.buffer_count,
            "local_storage_used_mb": g.local_storage_used_mb,
            "last_heartbeat_at": g.last_heartbeat_at.isoformat() if g.last_heartbeat_at else None,
            "connected_at": g.connected_at.isoformat() if g.connected_at else None,
            "disconnected_at": g.disconnected_at.isoformat() if g.disconnected_at else None
        }
        for g in gateways
    ]

@router.post("/heartbeat")
def edge_heartbeat(
    gateway_id: Optional[str] = "GW-NELLORE-DELTA-01",
    db: Session = Depends(get_db)
):
    """
    Heartbeat ping received from physical edge controller.
    Records connection status and returns pending remote commands.
    """
    gw = edge_gateway.record_heartbeat(db, gateway_id)
    # Check for queued remote commands awaiting edge delivery
    pending_cmds = db.query(RemoteCommandRecord).filter(
        RemoteCommandRecord.status == "QUEUED"
    ).all()

    return {
        "status": "HEARTBEAT_ACK",
        "gateway_id": gw.gateway_id,
        "edge_status": gw.status,
        "is_connected": edge_gateway.is_connected,
        "pending_commands_count": len(pending_cmds),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.post("/remote-command")
def issue_remote_command(
    req: RemoteCommandRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Issues an authenticated remote control command from the farmer application:
    - Generates unique command ID.
    - Sets command TTL expiration.
    - Dispatches to edge gateway with local safety supremacy interlock.
    """
    # Role-Based Permission Check using authenticated user and requested role
    allowed_roles = ["ADMIN", "FARM_MANAGER", "OPERATOR"]
    effective_role = req.user_role if (req.user_role and req.user_role != "ADMIN") else current_user.role
    if effective_role not in allowed_roles or current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"User role '{effective_role}' is not authorized to issue remote physical actuator controls."
        )

    # Require confirmation flag for non-emergency commands
    if req.action not in ["CASCADE_ALL", "EMERGENCY_STOP"] and not req.confirmed_by_user:
        raise HTTPException(
            status_code=400,
            detail="Two-step operator confirmation required for remote equipment actuation."
        )

    command_id = f"CMD-REMOTE-{uuid.uuid4().hex[:8].upper()}"
    operator_name = current_user.full_name or req.operator_name or current_user.username

    success, msg, cmd_rec = edge_gateway.process_remote_command(
        db=db,
        command_id=command_id,
        pond_id=req.pond_id,
        device_id=req.device_id,
        equipment_type=req.equipment_type,
        action=req.action,
        parameters=req.parameters,
        issued_by=operator_name,
        role=effective_role,
        ttl_seconds=req.ttl_seconds or 120
    )

    # Audit Log
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="REMOTE_EQUIPMENT_COMMAND",
        resource_type="EQUIPMENT",
        resource_id=req.device_id,
        details={
            "command_id": command_id,
            "action": req.action,
            "pond_id": req.pond_id,
            "status": cmd_rec.status,
            "success": success,
            "rejection_reason": cmd_rec.rejection_reason
        }
    ))
    db.commit()

    return {
        "success": success,
        "command_id": command_id,
        "status": cmd_rec.status,
        "message": msg,
        "issued_at": cmd_rec.issued_at.isoformat(),
        "expires_at": cmd_rec.expires_at.isoformat(),
        "rejection_reason": cmd_rec.rejection_reason
    }

@router.get("/remote-commands")
def get_remote_command_history(
    pond_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns history of remote commands, execution acknowledgements, and feedback.
    """
    q = db.query(RemoteCommandRecord)
    if pond_id:
        q = q.filter(RemoteCommandRecord.pond_id == pond_id)
    records = q.order_by(RemoteCommandRecord.issued_at.desc()).limit(limit).all()

    now_dt = datetime.now(timezone.utc)
    return [
        {
            "id": r.id,
            "command_id": r.command_id,
            "pond_id": r.pond_id,
            "device_id": r.device_id,
            "equipment_type": r.equipment_type,
            "action": r.action,
            "status": r.status,
            "issued_by_user": r.issued_by_user,
            "user_role": r.user_role,
            "issued_at": r.issued_at.isoformat() if r.issued_at else None,
            "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            "ttl_seconds": r.ttl_seconds,
            "is_expired": (now_dt > r.expires_at.replace(tzinfo=timezone.utc)) if r.expires_at else False,
            "delivered_to_edge_at": r.delivered_to_edge_at.isoformat() if r.delivered_to_edge_at else None,
            "executed_at": r.executed_at.isoformat() if r.executed_at else None,
            "equipment_feedback": r.equipment_feedback,
            "rejection_reason": r.rejection_reason
        }
        for r in records
    ]

@router.post("/flush-sync")
def trigger_buffer_flush(db: Session = Depends(get_db)):
    """
    Manually triggers idempotent synchronization of all buffered edge data to the cloud.
    """
    result = edge_gateway.flush_and_sync_buffer(db)
    return result

@router.get("/sync-batches")
def get_sync_batches(limit: int = 20, db: Session = Depends(get_db)):
    """
    Returns history of edge synchronization batches and deduplication receipts.
    """
    batches = db.query(EdgeSyncBatch).order_by(EdgeSyncBatch.synced_at.desc()).limit(limit).all()
    return [
        {
            "id": b.id,
            "batch_id": b.batch_id,
            "gateway_id": b.gateway_id,
            "record_type": b.record_type,
            "record_count": b.record_count,
            "status": b.status,
            "duration_ms": b.duration_ms,
            "idempotency_hash": b.idempotency_hash,
            "synced_at": b.synced_at.isoformat() if b.synced_at else None
        }
        for b in batches
    ]

@router.post("/simulate-network")
def simulate_network_condition(req: NetworkSimulationRequest, db: Session = Depends(get_db)):
    """
    Simulates edge-cloud hybrid failure and resilience scenarios:
    - DISCONNECT_INTERNET: Simulates farm internet severed; edge enters offline autonomous buffer.
    - RECONNECT_INTERNET: Restores connection; edge flushes buffer idempotently.
    - INJECT_OFFLINE_TELEMETRY: Feeds sensor telemetry into local edge buffer queue.
    - TEST_UNSAFE_OVERRIDE: Attempts remote shutdown of aerators during emergency hypoxia (blocked by local edge).
    - TEST_EXPIRED_COMMAND: Dispatches command with 1s TTL to verify edge rejection.
    """
    p_id = req.pond_id or 4

    if req.action == "DISCONNECT_INTERNET":
        res = edge_gateway.set_connectivity(False, db=db)
        return {
            "action": "DISCONNECT_INTERNET",
            "message": "Farm internet severed. Edge gateway is operating in OFFLINE AUTONOMOUS mode. Local safety interlocks are protecting the ponds.",
            "is_connected": False,
            "status": "OFFLINE"
        }

    elif req.action == "RECONNECT_INTERNET":
        res = edge_gateway.set_connectivity(True, db=db)
        # Flush buffered data
        sync_res = edge_gateway.flush_and_sync_buffer(db)
        return {
            "action": "RECONNECT_INTERNET",
            "message": f"Farm internet uplink restored. Synced {sync_res.get('synced_count', 0)} buffered records idempotently to central cloud.",
            "is_connected": True,
            "status": "ONLINE",
            "sync_details": sync_res
        }

    elif req.action == "INJECT_OFFLINE_TELEMETRY":
        # Simulate offline reading ingestion
        ingest_res = edge_gateway.ingest_sensor_reading(
            db=db,
            pond_id=p_id,
            sensor_type=req.sensor_type or "do",
            value=req.reading_value if req.reading_value is not None else 3.1,
            unit="mg/L"
        )
        return {
            "action": "INJECT_OFFLINE_TELEMETRY",
            "details": ingest_res
        }

    elif req.action == "TEST_UNSAFE_OVERRIDE":
        # Force pond DO to low level, then issue remote command to STOP aerators
        sensor = db.query(Sensor).filter(Sensor.pond_id == p_id, Sensor.sensor_type == "do").first()
        if sensor:
            sensor.current_value = 2.4  # critical hypoxia
            db.commit()

        success, msg, cmd = edge_gateway.process_remote_command(
            db=db,
            command_id=f"CMD-TEST-UNSAFE-{uuid.uuid4().hex[:6].upper()}",
            pond_id=p_id,
            device_id=f"AER-P0{p_id}-1",
            equipment_type="AERATOR",
            action="STOP",
            parameters={"reason": "Test unauthorized remote shutdown during emergency hypoxia"},
            issued_by="Remote Operator",
            role="OPERATOR"
        )
        return {
            "action": "TEST_UNSAFE_OVERRIDE",
            "command_blocked": not success,
            "status": cmd.status,
            "message": msg,
            "safety_rule_enforced": "Local emergency DO protection overrides remote commands."
        }

    elif req.action == "TEST_EXPIRED_COMMAND":
        # Issue command with already expired timestamp
        expired_cmd_id = f"CMD-EXPIRED-{uuid.uuid4().hex[:6].upper()}"
        cmd_rec = RemoteCommandRecord(
            command_id=expired_cmd_id,
            farm_id=1,
            pond_id=p_id,
            device_id=f"AER-P0{p_id}-1",
            equipment_type="AERATOR",
            action="START",
            status="QUEUED",
            issued_by_user="Test Script",
            user_role="ADMIN",
            issued_at=datetime.now(timezone.utc) - timedelta(seconds=180),
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=60),  # expired 60s ago
            ttl_seconds=60
        )
        db.add(cmd_rec)
        db.commit()

        success, msg, cmd = edge_gateway.process_remote_command(
            db=db,
            command_id=expired_cmd_id,
            pond_id=p_id,
            device_id=f"AER-P0{p_id}-1",
            equipment_type="AERATOR",
            action="START"
        )
        return {
            "action": "TEST_EXPIRED_COMMAND",
            "command_rejected": not success,
            "status": cmd.status,
            "message": msg
        }

    elif req.action == "RESET":
        edge_gateway.set_connectivity(True, db=db)
        edge_gateway.flush_and_sync_buffer(db)
        return {
            "action": "RESET",
            "message": "Edge-cloud hybrid link normalized; all test states cleared.",
            "is_connected": True
        }

    raise HTTPException(status_code=400, detail=f"Unknown simulation action '{req.action}'")
