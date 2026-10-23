# AquaIntel — Automation Safety & Interlock Specification

Automated control in commercial aquaculture involves biological assets valued at over ₹1 Crore per 10-hectare crop cycle. A single failure of aeration during an overnight oxygen crash can cause 100% mortality within 90 minutes.

AquaIntel enforces strict safety principles across embedded firmware, control services, and user interfaces.

---

## 1. Safety Priority Hierarchy (Section 15)

When deciding an actuation event, the system evaluates commands in strict priority order:

1. **Hardware Emergency & Physical Safety Interlocks:** Physical field toggle switches and thermal overload contactors always override automated cloud instructions.
2. **Local Critical Water-Quality Rules:** Critical dissolved oxygen (< 3.0 mg/L) automatically starts all available aerators and locks out feeding dispensers regardless of schedule.
3. **Sensor Validity & Staleness Protection:** If an optical DO sensor drops offline or its reading remains static for > 15 minutes, automated de-escalation is prohibited and a fail-safe aeration baseline is maintained.
4. **Operator Configured Safety Caps:** Daily feed quotas and maximum continuous runtimes are strictly enforced against runaway dispensing.
5. **Automated Hysteresis Policy:** Anti-cycle minimum ON and minimum OFF timers protect industrial paddlewheel motor windings from destructive high-frequency switching.
6. **AI Advisory Optimization:** Machine learning and nutrition models may only operate within the boundaries defined by levels 1 through 5.

---

## 2. Anti-Cycle Motor Hysteresis

Paddlewheel aerators utilize 1.5 kW (2 HP) to 2.2 kW (3 HP) three-phase induction motors with mechanical reduction gearboxes. Rapid cycling causes severe contactor arcing and thermal winding degradation.

- **Minimum ON Duration:** 10 Minutes (600 Seconds). Once an aerator starts, it will not be stopped for at least 10 minutes even if DO transiently rises above the cutoff threshold.
- **Minimum OFF Duration:** 10 Minutes (600 Seconds). Once an aerator stops, it will not be restarted for at least 10 minutes unless an EMERGENCY LOW DO condition (< 3.0 mg/L) is detected.
- **Hysteresis Band:** 0.4 mg/L gap between the activation threshold and deactivation cutoff.

---

## 3. Fail-Safe Feeding Interlock

Feeding prawns during hypoxic conditions (< 3.2 mg/L) is catastrophic:
- Shrimp ingest feed inefficiently during low oxygen conditions.
- Uneaten pellets accumulate on the pond bottom, undergoing anaerobic bacterial decomposition that consumes the remaining dissolved oxygen and produces lethal hydrogen sulfide ($H_2S$).
- **Rule:** Feeding is strictly blocked when DO < 3.2 mg/L.
