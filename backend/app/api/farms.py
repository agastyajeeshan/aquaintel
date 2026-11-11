from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Farm, Pond, Feeder, Aerator, Alert, IoTDevice, MaintenanceRecord, User
from ..core.iot_simulator import iot_simulator
from ..core.security import get_current_user_optional

router = APIRouter(prefix="/farms", tags=["Farms"])

@router.get("/overview")
def get_farm_overview(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    farm = None
    if current_user and current_user.farm_id:
        farm = db.query(Farm).filter(Farm.id == current_user.farm_id).first()
    if not farm:
        farm = db.query(Farm).first()

    pond_query = db.query(Pond).filter((Pond.is_archived == False) | (Pond.is_archived == None))
    if farm:
        pond_query = pond_query.filter(Pond.farm_id == farm.id)
    ponds = pond_query.all()
    
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

    # Aerator Energy & faults
    aerators = db.query(Aerator).all()
    total_kwh = sum(a.total_kwh_today or 0.0 for a in aerators)
    energy_cost_inr = round(total_kwh * 7.50, 2)
    running_aerators = sum(1 for a in aerators if a.status == "RUNNING")

    # Active alerts
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()

    # Pending maintenance
    pending_maintenance = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.status.in_(["PENDING", "IN_PROGRESS"])
    ).count()

    # Devices online
    devices = db.query(IoTDevice).all()
    total_devices = len(devices)
    online_devices = sum(1 for d in devices if d.status == "ONLINE") if not iot_simulator.is_offline else 0
    disconnected_devices = total_devices - online_devices

    return {
        "farm_id": farm.id if farm else 1,
        "farm_name": farm.name if farm else "AquaIntel Commercial Estate",
        "location": farm.location if farm else "Configured Farm Site",
        "total_area_ha": farm.total_area_ha if farm else 10.0,
        "total_ponds": total_ponds,
        "active_ponds": total_ponds,
        "healthy_ponds": healthy_count,
        "warning_ponds": warning_count,
        "critical_ponds": critical_count,
        "total_biomass_kg": round(total_biomass, 1),
        "today_feed_kg": round(today_feed_kg, 1),
        "energy_consumption_kwh": round(total_kwh, 1),
        "energy_cost_inr": energy_cost_inr,
        "active_alerts_count": active_alerts,
        "connected_devices": online_devices,
        "disconnected_devices": disconnected_devices,
        "running_aerators": running_aerators,
        "total_aerators": len(aerators),
        "pending_maintenance": pending_maintenance,
        "devices_online_ratio": f"{online_devices}/{total_devices}",
        "data_provenance": "DEMO" if iot_simulator else "LIVE",
        "is_simulated": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "connectivity": {
            "internet": "OFFLINE" if iot_simulator.is_offline else "ONLINE",
            "lora_gateway": "STANDBY_OFFLINE" if iot_simulator.gateway_offline else "ONLINE",
            "sync_queue_records": iot_simulator.offline_queue_count,
            "data_sync": "QUEUED" if iot_simulator.is_offline else "ACTIVE"
        }
    }
