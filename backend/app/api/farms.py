from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Farm, Pond, Feeder, Aerator, Alert, IoTDevice
from ..core.iot_simulator import iot_simulator

router = APIRouter(prefix="/farms", tags=["Farms"])

@router.get("/overview")
def get_farm_overview(db: Session = Depends(get_db)):
    farm = db.query(Farm).first()
    ponds = db.query(Pond).all()
    
    total_ponds = len(ponds)
    
    # Calculate statuses using simulator if active
    healthy_count = 0
    warning_count = 0
    critical_count = 0
    total_biomass = 0.0

    for p in ponds:
        total_biomass += p.estimated_biomass_kg or 0.0
        # If event is injected into simulator, reflect it
        sim_readings = iot_simulator.generate_current_pond_readings(p.id)
        stat = sim_readings["status"]
        if stat == "RED":
            critical_count += 1
        elif stat == "YELLOW":
            warning_count += 1
        else:
            healthy_count += 1

    # Today's feed dispensed
    feeders = db.query(Feeder).all()
    today_feed_kg = sum(f.dispensed_today_kg or 0.0 for f in feeders)
    if today_feed_kg == 0:
        today_feed_kg = 384.0

    # Aerator Energy
    aerators = db.query(Aerator).all()
    total_kwh = sum(a.total_kwh_today or 0.0 for a in aerators)
    energy_cost_inr = round(total_kwh * 7.50, 2)

    # Active alerts
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()

    # Devices online
    devices = db.query(IoTDevice).all()
    total_devices = len(devices)
    online_devices = sum(1 for d in devices if d.status == "ONLINE")

    return {
        "farm_name": farm.name if farm else "AquaIntel Commercial Estate",
        "location": farm.location if farm else "Nellore, Andhra Pradesh",
        "total_area_ha": farm.total_area_ha if farm else 10.0,
        "total_ponds": total_ponds,
        "healthy_ponds": healthy_count,
        "warning_ponds": warning_count,
        "critical_ponds": critical_count,
        "total_biomass_kg": round(total_biomass, 1),
        "today_feed_kg": round(today_feed_kg, 1),
        "energy_consumption_kwh": round(total_kwh, 1),
        "energy_cost_inr": energy_cost_inr,
        "active_alerts_count": active_alerts,
        "devices_online_ratio": f"{online_devices}/{total_devices}",
        "connectivity": {
            "internet": "OFFLINE" if iot_simulator.is_offline else "ONLINE",
            "lora_gateway": "ONLINE",
            "sync_queue_records": iot_simulator.offline_queue_count,
            "data_sync": "QUEUED" if iot_simulator.is_offline else "ACTIVE"
        }
    }
