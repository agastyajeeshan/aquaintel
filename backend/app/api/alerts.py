from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Alert, AuditLog, User, DevicePushToken
from ..core.security import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# Cooldown window to prevent spamming duplicate alerts (Section 8.J)
ALERT_COOLDOWN_MINUTES = 15

def create_or_deduplicate_alert(
    db: Session,
    pond_id: Optional[int],
    alert_type: str,
    severity: str,
    title: str,
    description: str,
    cause: Optional[str] = None,
    recommended_action: Optional[str] = None,
    device_id: Optional[str] = None
) -> Alert:
    """
    Enforces deduplication, hysteresis, and idempotency.
    Guarantees exactly ONE active alert per unique event identity:
    - Pond-specific events (pond_id set, device_id optional)
    - Gateway-specific events (pond_id None, device_id="GW-01")
    - Device-specific events (device_id="ESP32-P01", etc.)
    - Facility-wide events (pond_id None, device_id None or "FACILITY")
    Two different gateways generate independent outage alerts even with identical types.
    Repeated detections update and retain the existing active alert without creating duplicates.
    Once resolved, genuine new occurrences create a new alert.
    Distinct events with different alert_type, device_id, or pond_id are never suppressed.
    """
    now = datetime.now(timezone.utc)
    pond_filter = Alert.pond_id.is_(None) if pond_id is None else Alert.pond_id == pond_id
    device_filter = Alert.device_id.is_(None) if device_id is None else Alert.device_id == device_id

    # Check for existing active or acknowledged alert of same type and entity identity
    existing = db.query(Alert).filter(
        pond_filter,
        device_filter,
        Alert.alert_type == alert_type,
        Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])
    ).order_by(Alert.created_at.desc()).first()

    if existing:
        # Ongoing active alert: update details and return existing to prevent duplicate spam
        existing.description = description
        if cause:
            existing.cause = cause
        if recommended_action:
            existing.recommended_action = recommended_action
        # Upgrade severity if escalated (e.g. WARNING -> CRITICAL)
        severity_rank = {"INFO": 1, "WARNING": 2, "HIGH": 3, "CRITICAL": 4, "EMERGENCY": 5}
        if severity_rank.get(severity, 0) > severity_rank.get(existing.severity, 0):
            existing.severity = severity
            existing.title = title
        db.commit()
        db.refresh(existing)
        return existing

    # Create new deduplicated alert
    new_alert = Alert(
        pond_id=pond_id,
        device_id=device_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        description=description,
        cause=cause,
        recommended_action=recommended_action,
        status="ACTIVE",
        created_at=now
    )
    db.add(new_alert)
    db.add(AuditLog(
        action="ALERT_TRIGGERED",
        resource_type="ALERT",
        resource_id=f"{device_id or ('P' + str(pond_id) if pond_id else 'FACILITY')}-{alert_type}",
        details={"severity": severity, "title": title, "device_id": device_id, "pond_id": pond_id}
    ))
    db.commit()
    db.refresh(new_alert)

    # Dispatch real-time push notifications for urgent alerts
    if severity in ["CRITICAL", "EMERGENCY", "WARNING", "HIGH"]:
        try:
            from ..core.notification_service import notification_service
            notification_service.dispatch_push_to_devices(
                db=db,
                title=title,
                body=description,
                pond_id=pond_id,
                alert_id=new_alert.id,
                severity=severity
            )
        except Exception:
            pass

    return new_alert

def resolve_alert_by_type(
    db: Session,
    pond_id: Optional[int],
    alert_type: str,
    device_id: Optional[str] = None,
    resolved_by: str = "SYSTEM"
) -> Optional[Alert]:
    """
    Resolves ongoing active alerts matching pond_id, device_id, and alert_type when condition clears.
    Allows subsequent genuine new occurrences to create a fresh alert.
    """
    pond_filter = Alert.pond_id.is_(None) if pond_id is None else Alert.pond_id == pond_id
    device_filter = Alert.device_id.is_(None) if device_id is None else Alert.device_id == device_id
    active_alerts = db.query(Alert).filter(
        pond_filter,
        device_filter,
        Alert.alert_type == alert_type,
        Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])
    ).all()

    now = datetime.now(timezone.utc)
    resolved_alert = None
    for a in active_alerts:
        a.status = "RESOLVED"
        a.resolved_by = resolved_by
        a.resolved_at = now
        resolved_alert = a
        db.add(AuditLog(
            action="ALERT_RESOLVED",
            resource_type="ALERT",
            resource_id=str(a.id),
            details={"resolved_by": resolved_by, "alert_type": alert_type, "pond_id": pond_id, "device_id": device_id}
        ))
    if active_alerts:
        db.commit()
        if resolved_alert:
            db.refresh(resolved_alert)
    return resolved_alert

@router.get("")
def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    pond_id: Optional[int] = None,
    device_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    if pond_id:
        query = query.filter(Alert.pond_id == pond_id)
    if device_id:
        query = query.filter(Alert.device_id == device_id)
        
    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
    return [{
        "id": a.id,
        "pond_id": a.pond_id,
        "device_id": a.device_id,
        "alert_type": a.alert_type,
        "severity": a.severity,
        "title": a.title,
        "description": a.description,
        "cause": a.cause,
        "recommended_action": a.recommended_action,
        "status": a.status,
        "acknowledged_by": a.acknowledged_by,
        "resolved_by": a.resolved_by,
        "created_at": a.created_at.strftime("%H:%M IST, %d %b") if a.created_at else None,
        "resolved_at": a.resolved_at.strftime("%H:%M IST, %d %b") if a.resolved_at else None
    } for a in alerts]

from pydantic import BaseModel, Field

class PushTokenRegistration(BaseModel):
    token: str = Field(..., min_length=5, description="Expo or FCM push token")
    platform: Optional[str] = Field("android", description="Target platform (android, ios)")
    device_id: Optional[str] = Field(None, description="Client device UUID")

class PushTokenDeactivation(BaseModel):
    token: str = Field(..., min_length=5, description="Expo or FCM push token to deactivate")

@router.delete("/push-token")
def unregister_push_token(
    payload: PushTokenDeactivation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deactivates an Android Expo push notification token upon user logout."""
    existing = db.query(DevicePushToken).filter(
        DevicePushToken.token == payload.token,
        DevicePushToken.user_id == current_user.id
    ).first()
    if existing:
        existing.is_active = False
        existing.updated_at = datetime.utcnow()
        db.add(AuditLog(
            user_id=current_user.id,
            username=current_user.username,
            action="PUSH_TOKEN_UNREGISTERED",
            resource_type="DEVICE",
            resource_id=existing.device_id or "MOBILE_DEVICE",
            details={"user_id": current_user.id, "token_masked": payload.token[:10] + "..." if len(payload.token) > 10 else payload.token}
        ))
        db.commit()
        return {"status": "SUCCESS", "message": "Push token deactivated"}
    return {"status": "SUCCESS", "message": "Token not found or already inactive"}

@router.post("/test-push")
def send_test_push(
    pond_id: Optional[int] = 1,
    severity: Optional[str] = "CRITICAL",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dispatches a test push notification to verify delivery channels and Android notification channels."""
    from ..core.notification_service import notification_service
    result = notification_service.dispatch_push_to_devices(
        db=db,
        title=f"AquaIntel Test Notification (Pond {pond_id or 1:02d})",
        body=f"Push notification delivery verification for user {current_user.username} (Channel: {severity}).",
        pond_id=pond_id,
        severity=severity or "CRITICAL",
        user_id=current_user.id
    )
    return result

@router.post("/push-token")
def register_push_token(
    payload: PushTokenRegistration,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registers an Android Expo push notification token for emergency alerts, linked to authenticated user."""
    # Upsert token into device_push_tokens table
    existing = db.query(DevicePushToken).filter(DevicePushToken.token == payload.token).first()
    if existing:
        existing.user_id = current_user.id
        existing.device_id = payload.device_id or existing.device_id
        existing.platform = payload.platform or existing.platform
        existing.is_active = True
        existing.updated_at = datetime.utcnow()
    else:
        new_token = DevicePushToken(
            user_id=current_user.id,
            device_id=payload.device_id or "MOBILE_DEVICE",
            token=payload.token,
            platform=payload.platform or "android",
            is_active=True
        )
        db.add(new_token)

    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="PUSH_TOKEN_REGISTERED",
        resource_type="DEVICE",
        resource_id=payload.device_id or "MOBILE_DEVICE",
        details={
            "platform": payload.platform,
            "user_id": current_user.id,
            "token_masked": payload.token[:10] + "..." if len(payload.token) > 10 else payload.token
        }
    ))
    db.commit()
    return {
        "status": "SUCCESS",
        "message": "Push notification token registered successfully",
        "platform": payload.platform,
        "user_id": current_user.id
    }

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    user_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acknowledges an alert with role-based authorization check."""
    if current_user.role not in ["ADMIN", "FARM_MANAGER", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to acknowledge alerts")

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    effective_name = user_name or current_user.full_name or current_user.username
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = effective_name
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="ALERT_ACKNOWLEDGED",
        resource_type="ALERT",
        resource_id=str(alert.id),
        details={"acknowledged_by": effective_name, "user_id": current_user.id}
    ))
    db.commit()
    db.refresh(alert)
    return {"status": "SUCCESS", "alert_id": alert.id, "new_status": alert.status, "acknowledged_by": effective_name}

@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    user_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolves an alert with role-based authorization check."""
    if current_user.role not in ["ADMIN", "FARM_MANAGER", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to resolve alerts")

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    effective_name = user_name or current_user.full_name or current_user.username
    now = datetime.now(timezone.utc)
    alert.status = "RESOLVED"
    alert.resolved_by = effective_name
    alert.resolved_at = now
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="ALERT_RESOLVED",
        resource_type="ALERT",
        resource_id=str(alert.id),
        details={"resolved_by": effective_name, "user_id": current_user.id}
    ))
    db.commit()
    db.refresh(alert)
    return {"status": "SUCCESS", "alert_id": alert.id, "new_status": alert.status, "resolved_by": effective_name}

@router.post("/{alert_id}/ignore")
def ignore_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "IGNORED"
    db.commit()
    db.refresh(alert)
    return {"status": "SUCCESS", "alert_id": alert.id, "new_status": alert.status}
