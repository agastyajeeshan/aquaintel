from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Alert

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("")
def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
        
    alerts = query.order_by(Alert.created_at.desc()).all()
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
        "created_at": a.created_at.strftime("%H:%M IST, %d %b"),
        "resolved_at": a.resolved_at.strftime("%H:%M IST, %d %b") if a.resolved_at else None
    } for a in alerts]

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, user_name: str = "V. Naresh", db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_by = user_name
    db.commit()
    db.refresh(alert)
    return {"status": "SUCCESS", "alert_id": alert.id, "new_status": alert.status}

@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, user_name: str = "B. Venkat", db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "RESOLVED"
    alert.resolved_by = user_name
    alert.resolved_at = datetime.utcnow()
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
