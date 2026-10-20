import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from ..core.iot_simulator import iot_simulator
from ..schemas import InjectEventRequest, OfflineToggleRequest

router = APIRouter(prefix="/simulator", tags=["IoT Simulator & Live Telemetry"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@router.get("/status")
def get_simulator_status():
    return {
        "is_offline": iot_simulator.is_offline,
        "offline_queue_count": iot_simulator.offline_queue_count,
        "injected_events": iot_simulator.injected_events,
        "active_events_count": len(iot_simulator.injected_events),
        "total_ponds_monitored": 10
    }

@router.post("/inject")
def inject_event(req: InjectEventRequest):
    res = iot_simulator.inject_event(req.pond_id, req.event_type)
    return res

@router.post("/reset")
def reset_all_events():
    iot_simulator.reset_all_events()
    return {"status": "SUCCESS", "message": "All injected stress events cleared. Normal diurnal rhythm active."}

@router.post("/offline")
def toggle_offline(req: OfflineToggleRequest):
    synced = iot_simulator.set_offline_mode(req.offline)
    return {
        "is_offline": iot_simulator.is_offline,
        "records_synced": synced,
        "queue_count": iot_simulator.offline_queue_count,
        "message": f"Switched to {'OFFLINE MODE (Local Gateway Storing Data)' if req.offline else f'ONLINE MODE (Synchronized {synced} queued records to Cloud)'}"
    }

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Broadcast snapshot every 3 seconds
            snapshot = iot_simulator.generate_all_ponds_snapshot()
            payload = {
                "type": "TELEMETRY_UPDATE",
                "is_offline": iot_simulator.is_offline,
                "offline_queue_count": iot_simulator.offline_queue_count,
                "ponds": snapshot
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
