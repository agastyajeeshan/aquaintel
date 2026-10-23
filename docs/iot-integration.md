# AquaIntel — IoT & Edge Integration Guide

AquaIntel connects multi-probe sensor buoys, aerator switchgear, and automated solar feeders across a 10-hectare commercial prawn facility using long-range sub-GHz packet radio (LoRa) and lightweight MQTT messaging.

---

## 1. Network Topology & RF Specifications

- **Edge Transceivers:** Semtech SX1276 / SX1262 LoRa modules connected to ESP32-WROOM-32D microcontrollers.
- **Frequency Band:** 865.2 MHz (India IN865 license-free ISM band).
- **Modulation Settings:** Spreading Factor 10, Bandwidth 125 kHz, Coding Rate 4/5.
- **Range:** Up to 3.5 km line-of-sight covering the complete 10-hectare farm footprint.
- **Gateway Backhaul:** Ethernet LAN / 4G LTE router forwarding LoRa frames to local Mosquitto MQTT broker.

---

## 2. MQTT Topic Architecture

```
aquaintel/v1/{farm_id}/{pond_id}/{device_id}/telemetry
aquaintel/v1/{farm_id}/{pond_id}/{device_id}/status
aquaintel/v1/{farm_id}/{pond_id}/{device_id}/command
aquaintel/v1/{farm_id}/{pond_id}/{device_id}/ack
```

### Telemetry Packet Example:
```json
{
  "schema_version": "1.0",
  "message_id": "MSG-P01-20261023-0012",
  "device_id": "ESP32-P01",
  "farm_id": "farm-01",
  "pond_id": 1,
  "timestamp": "2026-10-23T06:40:00Z",
  "mode": "SIMULATED",
  "readings": {
    "do_mg_l": 5.82,
    "ph": 8.05,
    "temperature_c": 29.4,
    "salinity_ppt": 21.0,
    "ammonia_mg_l": 0.022,
    "turbidity_cm": 34.0,
    "water_level_m": 1.28
  },
  "sensor_status": {
    "do": "OK",
    "ph": "OK",
    "temperature": "OK"
  }
}
```

### Actuator Command Example:
```json
{
  "schema_version": "1.0",
  "command_id": "CMD-AER-P01-START",
  "device_id": "ESP32-P01",
  "action": "SET_STATE",
  "target_state": "ON",
  "issued_at": "2026-10-23T06:40:00Z",
  "expires_at": "2026-10-23T06:45:00Z",
  "reason": "CRITICAL_LOW_DO",
  "mode": "AUTO"
}
```

---

## 3. Edge State Machine & Offline Operation

The ESP32 Pond Master controller runs a deterministic firmware loop independent of internet availability:
1. If DO drops below 3.0 mg/L: Local relay engages paddlewheel aerator and locks out automated feeding instantly.
2. If internet connection is lost: The controller logs sensor readings into local non-volatile flash (SPIFFS/SD) in a FIFO buffer.
3. Upon reconnection: The gateway automatically synchronizes buffered queue records without duplicate processing.
