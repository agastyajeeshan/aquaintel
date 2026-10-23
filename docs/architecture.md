# AquaIntel — System Architecture Specification
### Smart Prawn Farm Automation & AI-Based Disease Risk Management
*Target Deployment: 10-Hectare Commercial Penaeus vannamei Farm in Nellore, Andhra Pradesh, India*

---

## 1. System Overview & Core Workflow

AquaIntel is an enterprise-grade digital aquaculture automation and artificial intelligence platform. Its fundamental operational loop follows the principle:

```
SENSE ──► VALIDATE ──► ANALYZE ──► PREDICT ──► DECIDE ──► ACT ──► VERIFY
```

1. **SENSE:** Submerged optical sensor buoys sample water quality parameters (DO, pH, temperature, salinity, ammonia, turbidity, water level) at 3-second intervals.
2. **VALIDATE:** The edge controller performs immediate range validation and sanity checks (detecting disconnected probes, out-of-bound jumps, or frozen ADC readings).
3. **ANALYZE:** Time-series feature extraction evaluates diurnal curves, DO drop velocity (mg/L/hr), and cumulative stress indicators.
4. **PREDICT:** AI and rule-based models forecast environmental disease risk (WSSV, Vibriosis, EMS/AHPND) and check-tray feeding response.
5. **DECIDE:** Multi-stage priority decision engine evaluates hardware emergency rules, local water quality thresholds, anti-cycle hysteresis, and operator daily quotas.
6. **ACT:** Actuator commands are dispatched to aerator VFDs/contactors and automated solar feeders with cryptographic message IDs, expiration timestamps, and delivery guarantees.
7. **VERIFY:** Current sensor feedback confirms physical dissolved oxygen restoration, check-tray clearance, and motor electrical current draw.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Pond Bank [Pond Bank & Water Surface]
        Sensors[Optical Multi-Probes<br/>DO, pH, Temp, NH3, Salinity] -->|RS485 Modbus| EdgeNode[ESP32 Pond Master Edge Controller]
        EdgeNode -->|Local Safety Relay| Aerators[Paddlewheel Aerators]
        EdgeNode -->|Local Lockout Relay| Feeders[Smart Feeders]
    end

    subgraph Farm Network [Farm Local Network]
        EdgeNode -->|LoRa 865.2 MHz IN865| Gateway[Central LoRa Gateway]
        Gateway -->|Ethernet / 4G LTE| LocalBroker[Mosquitto MQTT Broker]
    end

    subgraph Backend Cloud [Backend Platform Service]
        LocalBroker -->|MQTT / REST / WS| FastAPIServer[FastAPI Server Python 3.10+]
        FastAPIServer --> TelemetryEngine[Telemetry Ingestion & Deduplication]
        FastAPIServer --> ControlService[Priority Control Service]
        FastAPIServer --> AIEngine[Explainable Disease & Anomaly Models]
        FastAPIServer --> Database[(PostgreSQL / SQLite Storage)]
    end

    subgraph Client Tier [User Interfaces & Monitoring]
        FastAPIServer -->|REST API v1| WebApp[AquaIntel React 19 + Vite Dashboard]
        FastAPIServer -->|WebSocket /ws/telemetry| LiveStream[Real-Time Live Telemetry Stream]
    end
```

---

## 3. Modular Decoupling & Failure Isolation

AquaIntel strictly segregates responsibilities across independent services:
- **Local Autonomy:** Loss of internet or cloud connectivity does **not** interrupt critical pond aeration. The local edge state machine continues dissolved oxygen monitoring and hysteresis aerator control.
- **Dry-Run & Simulation:** The platform includes an internal deterministic telemetry generator capable of simulating all 15 operational and failure scenarios without physical hardware.
- **Auditability:** Every command, parameter change, threshold adjustment, and alert acknowledgment is immutably logged to the `audit_logs` table.
