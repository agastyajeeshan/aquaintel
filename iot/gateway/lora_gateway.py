import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

logger = logging.getLogger("aquaintel.gateway")

class LoRaGatewaySimulator:
    """
    Central LoRa Gateway 865.2 MHz (IN865 Band) Simulator
    Features:
    - Ingests 865 MHz packet radio frames from ESP32 edge buoys
    - Emulates store-and-forward local buffering when WAN backhaul is offline
    - Formats MQTT JSON payloads to topics:
      aquaintel/v1/{farm_id}/{pond_id}/{device_id}/telemetry
    """

    def __init__(self, gateway_id: str = "GW-LORA-CENTRAL-01", farm_id: str = "farm-01"):
        self.gateway_id = gateway_id
        self.farm_id = farm_id
        self.is_connected = True
        self.offline_queue: List[Dict[str, Any]] = []

    def receive_packet_radio_frame(self, pond_id: int, device_id: str, payload_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulates receiving a LoRa packet from an edge node.
        """
        mqtt_topic = f"aquaintel/v1/{self.farm_id}/{pond_id}/{device_id}/telemetry"
        now = datetime.now(timezone.utc)

        envelope = {
            "gateway_id": self.gateway_id,
            "topic": mqtt_topic,
            "received_at": now.isoformat(),
            "payload": payload_data,
            "radio_rssi_dbm": -52,
            "radio_snr_db": 9.5
        }

        if not self.is_connected:
            self.offline_queue.append(envelope)
            logger.warning(f"[GATEWAY] Backhaul offline. Queued packet for {device_id}. Queue size: {len(self.offline_queue)}")
            return {
                "status": "QUEUED_OFFLINE",
                "queue_size": len(self.offline_queue),
                "topic": mqtt_topic
            }

        logger.info(f"[GATEWAY] Forwarded packet to MQTT: {mqtt_topic}")
        return {
            "status": "FORWARDED",
            "topic": mqtt_topic,
            "envelope": envelope
        }

    def reconnect_and_flush(self) -> int:
        """
        Flushes buffered queue when backhaul connectivity is restored.
        """
        self.is_connected = True
        flushed_count = len(self.offline_queue)
        self.offline_queue.clear()
        logger.info(f"[GATEWAY] Reconnected. Flushed {flushed_count} queued records to cloud.")
        return flushed_count
