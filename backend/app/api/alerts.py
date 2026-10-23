from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Alert, AuditLog

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# Cooldown window to prevent spamming duplicate alerts (Section 8.J)
ALERT_COOLDOWN_MINUTES = 15

def create_or_deduplicate_alert(
    db: Session,
    pond_id: int,
    alert_type: str,
    severity: str,
    title: str,
    description: str,
    cause: Optional[str] = None,
    recommended_action: Optional[str] = None
) -> Alert:
    """
    Enforces deduplication, hysteresis, and cooldowns.
    Avoids repeatedly generating duplicate alerts for the same condition.
    """
    now = datetime.now(timezone.utc)
    cooldown_threshold = now - timedelta(minutes=ALERT_COOLDOWN_MINUTES)

    # Check for existing active or recently acknowledged alert of same type for pond
    existing = db.query(Alert).filter(
        Alert.pond_id == pond_id,
        Alert.alert_type == alert_type,
        Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])
    ).order_by(Alert.created_at.desc()).first()

    if existing:
        # Check if within cooldown window
        existing_ts = existing.created_at.replace(tzinfo=timezone.utc) if existing.created_at.tzinfo is None else existing.created_at
        if existing_ts > cooldown_threshold:
            # Update description and keep single active alert
            existing.description = description
            db.commit()
            return existing

    # Create new deduplicated alert
    new_alert = Alert(
        pond_id=pond_id,
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
        resource_id=f"P{pond_id}-{alert_type}",
        details={"severity": severity, "title": title}
    ))
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.get("")
def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    pond_id: Optional[int] = None,
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
        
    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
    return [{
        "id": a.id,
        "pond_id": a.pond_id,
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

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, user_name: str = "V. Naresh (Farm Manager)", db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = user_name
    db.add(AuditLog(
        action="ALERT_ACKNOWLEDGED",
        resource_type="ALERT",
        resource_id=str(alert.id),
        details={"acknowledged_by": user_name}
    ))
    db.commit()
    db.refresh(alert)
    return {"status": "SUCCESS", "alert_id": alert.id, "new_status": alert.status}

@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, user_name: str = "B. Venkat (Shift Field Lead)", db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    now = datetime.now(timezone.utc)
    alert.status = "RESOLVED"
    alert.resolved_by = user_name
    alert.resolved_at = now
    db.add(AuditLog(
        action="ALERT_RESOLVED",
        resource_type="ALERT",
        resource_id=str(alert.id),
        details={"resolved_by": user_name}
    ))
    db.commit()
    db.refresh(alert)
    return {"status": "SUCCESS", "alert_id": alert.id, "new_status": alert.status}

@router.post("/{alert_id}/ignore")
def ignore_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "IGNORED"
    db.commit()
    db.refresh(alert)
    return {"status": "SUCCESS", "alert_id": alert.id, "new_status": alert.status}
