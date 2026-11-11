from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Pond, AuditLog, User
from ..core.disease_engine import disease_risk_engine
from ..core.iot_simulator import iot_simulator
from ..core.security import get_current_user

router = APIRouter(prefix="/disease", tags=["Disease Intelligence"])

class HealthObservationRequest(BaseModel):
    pond_id: int = Field(..., ge=1)
    symptoms: List[str] = Field(default_factory=list)
    mortality_observed: int = Field(0, ge=0)
    feeding_response: str = Field("NORMAL")  # NORMAL, REDUCED, ABNORMAL
    observation_type: str = Field("FARMER_OBSERVED")  # FARMER_OBSERVED, SPECIALIST_ESCALATION, LAB_CONFIRMED
    notes: Optional[str] = None

@router.get("/risks")
def get_all_disease_risks(pond_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Pond)
    if pond_id:
        query = query.filter(Pond.id == pond_id)
    ponds = query.order_by(Pond.pond_number).all()

    result = []
    for p in ponds:
        sim_data = iot_simulator.generate_current_pond_readings(p.id)
        metrics = sim_data["metrics"]
        
        do_val = metrics["do"]["value"]
        temp_val = metrics["temperature"]["value"]
        ph_val = metrics["ph"]["value"]
        ammonia_val = metrics["ammonia"]["value"]
        salinity_val = metrics["salinity"]["value"]

        # Run explainable engine for 3 major shrimp pathogens
        diseases = ["WSSV", "Vibriosis", "EMS_AHPND"]
        pond_predictions = []
        for d in diseases:
            eval_res = disease_risk_engine.evaluate_risk(
                disease_key=d,
                do_mg_l=do_val,
                temp_c=temp_val,
                ph=ph_val,
                ammonia_mg_l=ammonia_val,
                salinity_ppt=salinity_val,
                doc=p.current_age_days or 45,
                feeding_reduction_pct=50.0 if sim_data["status"] == "RED" else 0.0
            )
            pond_predictions.append(eval_res)

        result.append({
            "pond_id": p.id,
            "pond_number": p.pond_number,
            "pond_name": p.name,
            "current_status": sim_data["status"],
            "doc": p.current_age_days,
            "live_metrics": {
                "do": do_val,
                "temperature": temp_val,
                "ph": ph_val,
                "ammonia": ammonia_val,
                "salinity": salinity_val
            },
            "predictions": pond_predictions,
            "disclaimer": disease_risk_engine.evaluate_risk("WSSV", 6.0, 29.0, 8.0, 0.02, 20.0, 40)["disclaimer"]
        })

    return result

@router.post("/evaluate")
def evaluate_custom_risk(
    disease_key: str = Query("WSSV", pattern="^(WSSV|Vibriosis|EMS_AHPND)$"),
    do_mg_l: float = 4.2,
    temp_c: float = 27.5,
    ph: float = 8.1,
    ammonia_mg_l: float = 0.08,
    salinity_ppt: float = 22.0,
    doc: int = 45,
    feeding_reduction_pct: float = 20.0
):
    return disease_risk_engine.evaluate_risk(
        disease_key=disease_key,
        do_mg_l=do_mg_l,
        temp_c=temp_c,
        ph=ph,
        ammonia_mg_l=ammonia_mg_l,
        salinity_ppt=salinity_ppt,
        doc=doc,
        feeding_reduction_pct=feeding_reduction_pct
    )

@router.post("/observations", status_code=201)
def record_health_observation(
    req: HealthObservationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Records farmer-observed symptoms or requests specialist pathology escalation."""
    if current_user.role not in ["ADMIN", "FARM_MANAGER", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Not authorized to submit pond health observations")

    pond = db.query(Pond).filter(Pond.id == req.pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    action_type = "SPECIALIST_ESCALATION_REQUESTED" if req.observation_type == "SPECIALIST_ESCALATION" else "POND_HEALTH_OBSERVATION"
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action=action_type,
        resource_type="POND",
        resource_id=str(req.pond_id),
        details={
            "pond_id": req.pond_id,
            "pond_name": pond.name,
            "observation_type": req.observation_type,
            "symptoms": req.symptoms,
            "mortality_observed": req.mortality_observed,
            "feeding_response": req.feeding_response,
            "notes": req.notes,
            "recorded_by": current_user.full_name or current_user.username,
        }
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "status": "SUCCESS",
        "observation_id": log.id,
        "action": action_type,
        "pond_id": req.pond_id,
        "observation_type": req.observation_type,
        "recorded_at": log.timestamp.isoformat() if log.timestamp else datetime.now(timezone.utc).isoformat(),
        "message": "Specialist escalation logged to farm audit trail." if req.observation_type == "SPECIALIST_ESCALATION" else "Farmer health observation recorded."
    }

@router.get("/observations")
def list_health_observations(
    pond_id: Optional[int] = None,
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db)
):
    """Lists recent farmer health observations and specialist escalations."""
    logs = db.query(AuditLog).filter(
        AuditLog.action.in_(["POND_HEALTH_OBSERVATION", "SPECIALIST_ESCALATION_REQUESTED"])
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()

    items = []
    for l in logs:
        details = l.details or {}
        if pond_id and details.get("pond_id") != pond_id:
            continue
        items.append({
            "id": l.id,
            "action": l.action,
            "pond_id": details.get("pond_id"),
            "pond_name": details.get("pond_name"),
            "observation_type": details.get("observation_type", "FARMER_OBSERVED"),
            "symptoms": details.get("symptoms", []),
            "mortality_observed": details.get("mortality_observed", 0),
            "feeding_response": details.get("feeding_response", "NORMAL"),
            "notes": details.get("notes"),
            "recorded_by": details.get("recorded_by") or l.username,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None
        })
    return items
