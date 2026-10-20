from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Pond
from ..core.disease_engine import disease_risk_engine
from ..core.iot_simulator import iot_simulator

router = APIRouter(prefix="/disease", tags=["Disease Intelligence"])

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
