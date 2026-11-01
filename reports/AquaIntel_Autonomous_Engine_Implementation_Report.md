# AQUAINTEL — FULLY AUTONOMOUS INTELLIGENT FARM MANAGEMENT ENGINE
## Technical Verification & System Implementation Report

**Document Reference:** AQUAINTEL-ENG-AUTONOMOUS-2026-V1  
**Project:** AquaIntel — Autonomous Aquaculture Platform  
**Target Species:** *Litopenaeus vannamei* (Pacific White Shrimp)  
**Facility Context:** 10-Hectare Semi-Intensive Coastal Delta Basin Cluster (10 Ponds)  
**Version:** 1.0 Production Architecture  
**Date:** November 1, 2026  
**Status:** Verified & Integrated (`60/60` Backend Tests Passed, Clean Production Build)

---

## 1. Executive Summary & Transformation Objective

AquaIntel has been transformed from a passive monitoring and predictive dashboard into an **Autonomous Aquaculture Farm Management Platform**.

Prior to this implementation, aquaculture operators were required to manually interpret dissolved oxygen drops, calculate un-ionized ammonia fractions, evaluate flood risks from sudden precipitation, and initiate routine equipment activations. Under severe nocturnal hypoxia or sudden electrical contactor trips, human latency of even 15 to 30 minutes frequently leads to irreversible mortality in high-density *L. vannamei* cultures.

The newly deployed **Fully Autonomous Intelligent Farm Management Engine** continuously ingests telemetry across all available pond sensors, validates data freshness and sensor sanity, cross-evaluates multi-parameter biological and environmental risks, dispatches deterministic pre-authorized physical actions (such as emergency aeration cascade, aerator backup failover, and feeder suspension), notifies farm personnel across synchronized channels, and executes closed-loop recovery verification.

```
       ┌─────────────────────────────────────────────────────────────┐
       │             CONTINUOUS MULTI-SENSOR INGESTION               │
       │  DO • Temp • pH • TAN/NH3 • Salinity • Water Level • Weather│
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │              SENSOR SANITY & STALENESS ENGINE               │
       │   NaN Detection • Marine Physics Boundaries • Age (< 180s)  │
       └──────────────────────────────┬──────────────────────────────┘
                                      │ (Telemetry Validated)
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │             MULTI-PARAMETER DECISION ENGINE                 │
       │ • Emerson (1975) NH3 Equilibrium: pKa = 0.09018 + 2729.9/(T)│
       │ • Thermal-DO Coupling & Hypoxia Predictive Cascade          │
       │ • Heavy Rain / Osmotic Dilution Flood Safeguards            │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │           HARDWARE ABSTRACTION LAYER (HAL)                  │
       │ • Deterministic Safety Interlocks (NO Chemical Dosing)      │
       │ • Anti-Cycling Hysteresis (Min ON: 600s, Min OFF: 300s)     │
       │ • Motor Relay Feedback & Backup Aerator Failover            │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │               EVENT-DRIVEN NOTIFICATION SERVICE             │
       │  Standardized 9-Field Payload • SHA-256 Dedup • 3-Tier Escal│
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │            CLOSED-LOOP RECOVERY VERIFICATION                │
       │ Condition Detected ➔ Command Acknowledged ➔ Recovery Verified│
       └─────────────────────────────────────────────────────────────┘
```

---

## 2. Continuous Monitoring Architecture

The autonomous engine monitors all 16 critical pond and operational parameters:

| Category | Telemetry Channel | Nominal Marine Range | Critical Safety Trigger | Failsafe / Interlock Action |
| :--- | :--- | :--- | :--- | :--- |
| **Water Quality** | Dissolved Oxygen (DO) | 5.0 – 8.5 mg/L | `< 3.5 mg/L` (Warning)<br>`< 3.0 mg/L` (Emergency) | 100% Aeration Cascade; Backup Failover; Feeder Cutoff |
| **Water Quality** | Water Temperature | 26.0 – 32.0 °C | `> 33.5 °C` | Suspend feeding; adjust aeration readiness |
| **Water Quality** | Electrochemical pH | 7.5 – 8.5 pH | `< 7.2` or `> 8.8` | Adjust NH3/H2S risk weighting; alert operator |
| **Water Quality** | Salinity | 15.0 – 28.0 ppt | `< 12.0 ppt` | Flood stratification alert; activate surface aerators |
| **Water Quality** | Total Ammonia Nitrogen (TAN)| 0.0 – 0.5 mg/L | `> 0.50 mg/L` | Emerson calculation trigger; reduce/suspend feeding |
| **Chemical Coupling**| Un-Ionized Ammonia ($NH_3$)| `< 0.02 mg/L` | `> 0.05 mg/L` | Instant motorized feeder lockout; exchange recommendation |
| **Water Quality** | Nitrite ($NO_2^-$) | `< 0.20 mg/L` | `> 0.50 mg/L` | Elevate chloride ratio advisory; suspend feeding |
| **Physical Pond** | Water Level | 1.10 – 1.35 m | `> 1.45 m` | Skim gate overflow armed; prevent refilling |
| **Physical Pond** | Turbidity / Secchi Disk | 30.0 – 45.0 cm | `< 25 cm` or `> 60 cm` | Plankton crash / bloom warning; advisory logged |
| **Meteorology** | Rainfall & Rain Rate | 0.0 – 10.0 mm/hr | `> 25.0 mm/hr` | Flood destratification safeguard; run aerators |
| **Meteorology** | Relative Humidity & Wind | 60 – 90% | Sudden squall (>40 km/h) | Secure feeder hoppers; aerator stability monitor |
| **Biology** | Biomass & Feed Response | 80 – 100% tray | `< 30%` consumption | Anorexia interlock; automated feeding suspended |
| **Biology** | Mortality Observations | 0 dead / tray | `> 5 dead / tray` | Disease cascade advisory; sample submission alert |
| **Equipment** | Aerator Relay Status | RUNNING / STANDBY | Contactor Trip / Overload | Failover to redundant backup aerator (`AER-P0X-D`) |
| **Equipment** | Feeder Motor Status | IDLE / DISPENSING | Motor Jam / No Power | Lockout alert; technician dispatch |
| **Infrastructure** | Edge-Cloud Connectivity | SYNCED | Disconnected | Edge RTU continues deterministic safety loop locally |

---

## 3. Autonomous Decision Engine

### 3.1 Decision Pipeline (13 Steps)
1. **Event Reception:** Telemetry captured via MQTT broker and SQLite storage.
2. **Sensor Validation:** Detection of NaN, nulls, marine physical boundary violations, and timestamp staleness (> 180 seconds).
3. **Abnormal Condition Detection:** Deviation from configured thresholds.
4. **Multi-Parameter Evaluation:** Chemical and physical equilibrium models evaluated together.
5. **Pond-Specific Setting Lookup:** Stage of culture (DOC) and pond biomass thresholds retrieved.
6. **Weather Context Integration:** Rainfall rate and air temperature evaluated.
7. **Severity Determination:** `NORMAL`, `ADVISORY`, `WARNING`, `CRITICAL`, `EMERGENCY`.
8. **Action Selection:** Deterministic lookup from authorized safety matrix.
9. **Equipment Safety & Interlock Check:** Anti-cycling hysteresis (min ON: 600s, min OFF: 300s).
10. **Autonomous Command Dispatch:** Hardware Abstraction Layer transmits encrypted relay instruction.
11. **Relay & Motor Feedback Verification:** Acknowledgement received or trip fault detected.
12. **Closed-Loop Parameter Recovery:** Follow-up sensor checks against recovery targets.
13. **Audit Recording & Farmer Notification:** Structured payload dispatched and logged to audit trail.

### 3.2 Validated Multi-Parameter Intelligence Models

#### A. Emerson et al. (1975) Un-Ionized Ammonia ($NH_3$) Equilibrium
Total Ammonia Nitrogen (TAN) exists in aqueous equilibrium between non-toxic ammonium ions ($NH_4^+$) and lethal un-ionized ammonia ($NH_3$). The toxic fraction $f$ depends strongly on temperature and pH:

$$pK_a = 0.09018 + \frac{2729.92}{273.15 + T_C}$$

$$f = \frac{1}{10^{(pK_a - pH)} + 1}$$

$$[NH_3] = \text{TAN} \times f$$

*Provenance:* Emerson, K., Russo, R. C., Lund, R. E., & Thurston, R. V. (1975). Aqueous ammonia equilibrium calculations: effect of pH and temperature. *Journal of the Fisheries Research Board of Canada*, 32(12), 2379-2383.  
*Safety Rule:* When $[NH_3] > 0.05 \text{ mg/L}$, automated feeders are locked out immediately, preventing metabolic ammonia excretion spikes.

#### B. Thermal-DO Hypoxia Cascade
Warm water holds less dissolved oxygen at saturation. High water temperatures ($>32^\circ\text{C}$) elevate shrimp metabolic respiration while lowering DO saturation. When DO drops below $3.5\text{ mg/L}$, a 100% aeration cascade engages all primary aerators and suspends feeding.

#### C. Heavy Rain & Salinity Dilution Flood Safeguard
Sudden coastal delta downpours create surface freshwater lenses that cause thermal stratification and osmotic shock in *L. vannamei*. When rainfall exceeds $25\text{ mm}$ and salinity drops below $15\text{ ppt}$, the engine commands destratification aerators to mix water layers, while prohibiting automated pond draining or refilling based solely on weather forecasts.

---

## 4. Hardware Abstraction Layer (HAL) & Equipment Control

The `HardwareController` provides an isolated, safety-interlocked interface between the decision engine and physical/simulated farm actuators:

### 4.1 Anti-Cycling Hysteresis & Minimum ON/OFF Times
- **Minimum Run Time (`min_on_seconds`):** 600 seconds (10 minutes). Aerators cannot be rapidly shut off once started.
- **Minimum Rest Time (`min_off_seconds`):** 300 seconds (5 minutes). De-energized motors cannot be immediately restarted, preventing contactor welding and thermal overload.
- **Recovery Hysteresis Threshold:** While emergency start activates at $\text{DO} < 3.5\text{ mg/L}$, aerators remain energized until $\text{DO} \ge 5.5\text{ mg/L}$ for at least 15 consecutive minutes.

### 4.2 Aerator Backup Failover
Each pond is provisioned with 4 aerators. The 4th unit (`AER-P0X-D` or `AER-P0X-4`) is designated as the redundant emergency backup:
- When a primary aerator command returns a `MOTOR_FAULT_TRIPPED` acknowledgement, the HAL instantly dispatches a `FAILOVER_BACKUP` command to the standby aerator.
- An `EMERGENCY` notification is dispatched to electrical maintenance technicians.

---

## 5. Mandatory Safety Interlocks & Hard Policy Guardrails

1. **Strict Prohibition on Autonomous Chemical / Therapeutic Dosing:**
   Section 5 dictates that autonomous dosing of formalin, copper sulfate, antibiotics, or probiotics without laboratory verification and certified veterinary sign-off is **strictly blocked**. The engine logs an advisory and alerts farm management.
2. **Local Edge Controller Autonomy:**
   Loss of cloud connectivity does **not** interrupt emergency DO protection. Edge RTUs run the deterministic safety hysteresis loop independently.
3. **Sensor Sanity & Staleness Gate:**
   No physical actuator may be toggled based on a single invalid reading, NaN, or telemetry older than 180 seconds. In such events, the system enters `HOLD_FAILSAFE_AERATION`.
4. **Manual Emergency Override:**
   Farm operators possess top-level authority to force 100% cascade aeration, trigger feeder lockouts, or reset trip flags at any time.

---

## 6. Event-Driven Notification Engine

### 6.1 Standardized Notification Payload
Every notification conforms strictly to the specification schema:
```json
{
  "pond_id": 4,
  "condition_detected": "LOW_DO_HYPOXIA",
  "actual_reading": 2.8,
  "unit": "mg/L",
  "configured_threshold": 3.5,
  "severity": "EMERGENCY",
  "time_detected": "2026-11-01T02:21:32.599805+00:00",
  "automatic_action_taken": "CASCADE_ALL_AERATORS_AND_HALT_FEEDING",
  "action_status": "EXECUTED",
  "recommended_next_steps": "Ensure continuous aeration until DO > 5.5 mg/L. Do not dispense feed.",
  "dispatched_channels": ["IN_APP", "DASHBOARD", "PUSH", "EMAIL", "SMS", "VOICE"],
  "escalation_level": 3
}
```

### 6.2 Deduplication & Escalation Tiers
- **SHA-256 Key Deduplication:** Computes hash of `pond_id:condition:severity`. Identical alerts within a 15-minute suppression window are suppressed to eliminate alert fatigue.
- **Escalation Levels:**
  - **Level 1 (Advisory / Normal):** In-App & Dashboard alert.
  - **Level 2 (Warning):** In-App, Dashboard, Web Push, and Email notification.
  - **Level 3 (Critical / Emergency):** In-App, Dashboard, Push, Email, SMS, and Voice Call dispatch.

---

## 7. Autonomous Operation Modes

The engine supports 4 distinct governance modes:

1. **MONITOR MODE:** Continuous telemetry ingestion, risk evaluation, and alert generation only. Physical equipment commands are completely inhibited (`ADVISORY_ONLY`).
2. **ASSISTED MODE:** Recommendations are calculated and displayed; human operator must click to authorize physical actuation.
3. **AUTOMATIC SAFETY MODE (Default):** Pre-authorized emergency actions (low DO aeration cascade, feeder suspension during hypoxia/ammonia, and backup aerator failover) execute automatically.
4. **FULL AUTOMATION MODE:** Additional routine controls (feeding schedule adaptation, dissolved oxygen skimming, water circulation) operate autonomously following full pond commissioning.

*Audit Guarantee:* The operating mode can never be changed silently. Every mode transition is authenticated, logged to `AuditLog`, and broadcasted to all active dashboards.

---

## 8. Database Architecture & API Schema

### 8.1 Database Tables Added
- **`automation_safety_config`:** Farm-wide and pond-specific thresholds, hysteresis settings, and operating mode state.
- **`autonomous_decision_events`:** Immutable record of every condition evaluated, multi-parameter rationale, and action chosen.
- **`autonomous_action_records`:** Closed-loop actuation history containing command ID, equipment code, relay feedback, and recovery status.
- **`notification_logs`:** Multi-channel alert history with structured payloads, deduplication keys, and delivery receipts.

### 8.2 REST API Surface (`/api/autonomous`)
- `GET /api/autonomous/status`: Returns current mode, active safety interlocks, and edge/cloud connectivity.
- `POST /api/autonomous/mode`: Authenticated mode transition with operator rationale.
- `GET /api/autonomous/decisions`: Timeline of evaluated multi-parameter events.
- `GET /api/autonomous/actions`: Hardware execution log and relay acknowledgements.
- `POST /api/autonomous/evaluate`: Triggers synchronous multi-parameter assessment cycle across all ponds.
- `POST /api/autonomous/override`: Manual emergency actuator command override.
- `GET / PUT /api/autonomous/safety-config`: Threshold and hysteresis configuration management.
- `GET /api/autonomous/notifications`: Notification history with delivery status.
- `POST /api/autonomous/verify-action/{action_id}`: Follow-up closed-loop sensor verification.
- `POST /api/autonomous/simulate-scenario`: Interactive test harness for 6 failure scenarios.

---

## 9. Frontend Autonomous Management Console

A Clean Soft UI console was developed at `frontend/src/pages/AutonomousEngine.tsx`:
- **Prominent Operating Mode Selector:** Displays `MONITOR`, `ASSISTED`, `AUTOMATIC_SAFETY`, and `FULL_AUTOMATION` with confirmation modals.
- **Closed-Loop Lifecycle Visualizer:** 6-step timeline illustrating continuous progression from telemetry to verified recovery.
- **Multi-Parameter Intelligence Cards:** Dedicated panels for Emerson Ammonia Equilibrium, Hypoxic Thermal-DO Coupling, and Hard Safety Interlocks.
- **Hardware Feedback & Recovery Tracker:** Live table of action records showing relay acknowledgements (`ACKNOWLEDGED` vs `MOTOR_FAULT_TRIPPED`) and pond recovery verification status.
- **Standardized Notification Feed:** Event audit stream formatted with severity tags, action badges, and escalation tiers.
- **Manual Emergency Override Bar:** Immediate buttons for 100% cascade aeration, feeder lockout, and safety reset.
- **Interactive Scenario Test Suite:** 1-click test injector for critical hypoxia, ammonia surge, flood dilution, chemical dosing block, and cloud disconnection.

---

## 10. Verification & Test Results

### 10.1 Backend Test Suite (`pytest`)
All 14 autonomous engine test specifications passed with 100% success rate:

```
tests/test_autonomous_engine.py::test_autonomous_status_and_mode_transitions PASSED
tests/test_autonomous_engine.py::test_critical_low_do_triggers_automatic_aeration_and_feeder_cutoff PASSED
tests/test_autonomous_engine.py::test_monitor_mode_blocks_automatic_actuation PASSED
tests/test_autonomous_engine.py::test_invalid_sensor_reading_blocks_unsafe_action PASSED
tests/test_autonomous_engine.py::test_stale_sensor_reading_blocks_action PASSED
tests/test_autonomous_engine.py::test_aerator_failure_activates_backup_aerator PASSED
tests/test_autonomous_engine.py::test_toxic_ammonia_surge_suspends_feeding PASSED
tests/test_autonomous_engine.py::test_heavy_rainfall_and_salinity_flood_safeguard PASSED
tests/test_autonomous_engine.py::test_chemical_and_medicine_dosing_hard_safety_lock PASSED
tests/test_autonomous_engine.py::test_cloud_disconnect_maintains_local_edge_protection PASSED
tests/test_autonomous_engine.py::test_notification_deduplication_and_escalation PASSED
tests/test_autonomous_engine.py::test_anti_cycling_hysteresis_prevention PASSED
tests/test_autonomous_engine.py::test_closed_loop_recovery_verification PASSED
tests/test_autonomous_engine.py::test_manual_emergency_override PASSED

======================== 14 passed, 1 warning in 0.62s =========================
```

### 10.2 Entire Backend Fleet Verification
```
60 passed, 40 warnings in 5.12s (100% Pass Rate across all test modules)
```

### 10.3 Frontend Compilation & Linting
- `tsc -b && vite build`: **0 compilation errors**, built in 425ms.
- ESLint: **0 errors**.

---

## 11. Conclusion & Operational Sign-off

The AquaIntel Fully Autonomous Intelligent Farm Management Engine has met all requirements outlined in the Master Specification. It bridges the gap between predictive intelligence and physical farm protection, enabling continuous, condition-based, fail-safe aquaculture operations with transparent, auditable governance.
