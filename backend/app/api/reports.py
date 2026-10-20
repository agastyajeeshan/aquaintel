from datetime import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Pond, Sensor, Feeder, Aerator, Alert
import io
import csv

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/daily")
def generate_daily_report(db: Session = Depends(get_db)):
    ponds = db.query(Pond).all()
    feeders = db.query(Feeder).all()
    aerators = db.query(Aerator).all()
    alerts = db.query(Alert).filter(Alert.status == "ACTIVE").all()

    now = datetime.utcnow()
    total_biomass = sum(p.estimated_biomass_kg or 0 for p in ponds)
    total_feed = sum(f.dispensed_today_kg or 0 for f in feeders)
    total_kwh = sum(a.total_kwh_today or 0 for a in aerators)

    return {
        "report_id": f"REP-DAILY-{now.strftime('%Y%m%d')}",
        "title": "AquaIntel Daily Operational & Water Quality Summary",
        "farm_name": "AquaIntel Delta Estate (10 Hectares)",
        "generated_at": now.strftime("%Y-%m-%d %H:%M:%S IST"),
        "executive_summary": {
            "total_ponds": len(ponds),
            "healthy_count": sum(1 for p in ponds if p.status == "GREEN"),
            "warning_count": sum(1 for p in ponds if p.status == "YELLOW"),
            "critical_count": sum(1 for p in ponds if p.status == "RED"),
            "total_biomass_kg": total_biomass,
            "feed_dispensed_today_kg": total_feed,
            "energy_consumed_kwh": round(total_kwh, 1),
            "estimated_daily_energy_cost_inr": round(total_kwh * 7.50, 2),
            "unresolved_alerts_count": len(alerts)
        },
        "pond_status_table": [{
            "pond_number": p.pond_number,
            "doc": p.current_age_days,
            "biomass_kg": p.estimated_biomass_kg,
            "survival_pct": p.survival_rate_pct,
            "status": p.status
        } for p in ponds],
        "active_alerts": [{
            "severity": a.severity,
            "title": a.title,
            "recommended_action": a.recommended_action
        } for a in alerts]
    }

@router.get("/export-csv")
def export_csv_data(db: Session = Depends(get_db)):
    ponds = db.query(Pond).all()
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Pond Number", "Name", "Area (Ha)", "Species", "DOC", "Biomass (kg)", "Survival (%)", "Target FCR", "Status"])
    for p in ponds:
        writer.writerow([
            p.pond_number,
            p.name,
            p.area_ha,
            p.shrimp_species,
            p.current_age_days,
            p.estimated_biomass_kg,
            p.survival_rate_pct,
            p.target_fcr,
            p.status
        ])
        
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=aquaintel_farm_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
    )
