# AQUAINTEL: 10-HECTARE COMMERCIAL SHRIMP FARM FINANCIAL ANALYSIS & ROI MODEL

## Executive Summary
This document outlines the detailed techno-economic feasibility, capital expenditure (CAPEX), operating expenditure (OPEX), and return on investment (ROI) model for deploying the **AQUAINTEL Smart Prawn Farm Automation & AI-Based Disease Risk Management Platform** on a **10-hectare commercial *Litopenaeus vannamei* (Pacific White Shrimp) farm** located in Nellore, Andhra Pradesh, India.

---

## 1. Farm Operating Baseline Parameters
- **Total Water Spread Area:** 10.0 Hectares (10 ponds of 1.0 Ha each)
- **Water Volume:** ~12,000 m³ per pond (Average depth: 1.2 meters)
- **Stocking Density:** 45 Post-Larvae (PL) per m² (~450,000 PL per pond)
- **Crop Cycles Per Year:** 2.5 cycles (DOC: 90–110 days per cycle)
- **Baseline Yield (Traditional):** 7.5 Metric Tonnes / Ha / Crop
- **Annual Production (Baseline):** 187,500 kg (187.5 MT)
- **Average Farm-Gate Realization:** ₹420 / kg (30-count head-on shell-on)
- **Gross Annual Farm Revenue:** ₹7,87,50,000 (~₹7.87 Crores)

---

## 2. Capital Expenditure (CAPEX) for 10 Hectares

| Category | Component Description | Units | Rate (₹) | Total (₹) |
|---|---|---|---|---|
| **IoT Telemetry Nodes** | Submersible RS485 Optical DO + Temperature Probe | 10 | 45,000 | 4,50,000 |
| | Industrial Gel-Filled pH Electrode Assembly | 10 | 12,000 | 1,20,000 |
| | Toroidal Inductive Salinity / EC Sensor | 10 | 18,000 | 1,80,000 |
| | Solar-Powered ESP32 Pond RTU Node (IP67) | 10 | 14,000 | 1,40,000 |
| **LoRaWAN Gateway** | Outdoor 8-Channel Industrial Gateway (IN865 MHz, 4G Backhaul) | 1 | 65,000 | 65,000 |
| **Smart Feeder Actuators** | Solar-Assisted Automated Feeders (120 kg hopper + RS485 RTU) | 10 | 52,000 | 5,20,000 |
| **Aerator Automation** | Dual-VFD Smart Starters with Hysteresis Relays (4 aerators/pond) | 10 | 48,000 | 4,80,000 |
| **Edge Server & Software** | On-Premises Edge Computer + AquaIntel Lifetime Core License | 1 | 1,45,000 | 1,45,000 |
| **Installation & Calibration** | Electrical Cabling, Masts, Floating Sensor Buoys & Commissioning | Lot | 1,00,000 | 1,00,000 |
| **TOTAL INITIAL CAPEX** | | | | **₹22,00,000 (₹22.00 Lakhs)** |

*Cost per Hectare:* **₹2,20,000 / Hectare**

---

## 3. Annual Operating Expenditure (OPEX)
- Optical sensor cap replacements & recalibration reagents: ₹75,000 / year
- 4G IoT M2M SIM cards & cloud synchronization: ₹24,000 / year
- Preventive electro-mechanical servicing: ₹85,000 / year
- System contingency & spare probe buffer: ₹36,000 / year
- **Total Annual OPEX:** **₹2,20,000 / year** (10% of CAPEX)

---

## 4. Annual Financial Benefits & Savings Breakdown

### A. Feed Cost Savings (FCR Optimization)
- Baseline Traditional FCR: **1.50**
- AquaIntel Optimized FCR: **1.25** (Saving of **0.25** in FCR)
- Feed Saved Annually: 187,500 kg × 0.25 = **46,875 kg** (46.8 MT)
- Commercial Feed Price: ₹88 / kg
- **Annual Feed Savings:** **₹41,25,000 (₹41.25 Lakhs)**

### B. Energy / Electricity Cost Savings (Aeration Hysteresis)
- Baseline Aerator Power: ~18,000 kWh / Ha / year × 10 Ha = 180,000 kWh
- Smart DO Hysteresis Reduction: **24%** (Stopping midday aerators during photosynthetic saturation)
- Energy Saved: 43,200 kWh
- Agricultural Tariff: ₹7.50 / kWh
- **Annual Energy Savings:** **₹3,24,000 (₹3.24 Lakhs)**

### C. Disease Loss Mitigation (Early Detection of WSSV / Vibriosis / EMS)
- Traditional Farm Disease Outbreak Mortality Loss: **~18%**
- AquaIntel Protected Loss Rate: **~4.5%** (Net reduction in catastrophic mortality: **13.5%**)
- Value of Protected Biomass: ₹7,87,50,000 × 13.5% = **₹1,06,31,250 (₹1.06 Crores)**

### D. Labor Efficiency
- Traditional labor requirement: 12 laborers @ ₹18,000 / month = ₹25,92,000 / year
- Automation savings (30% reduction in manual check-tray and aerator switching tasks):
- **Annual Labor Savings:** **₹7,77,600 (₹7.78 Lakhs)**

---

## 5. Summary ROI & Payback Matrix

| Metric | Conservative Scenario | Base Case Scenario | Optimistic Scenario |
|---|---|---|---|
| **Crops Per Year** | 2.0 | 2.5 | 2.8 |
| **Annual Feed Savings** | ₹26,00,000 | ₹41,25,000 | ₹67,20,000 |
| **Annual Energy Savings** | ₹2,16,000 | ₹3,24,000 | ₹4,05,000 |
| **Annual Labor Savings** | ₹5,18,400 | ₹7,77,600 | ₹10,36,800 |
| **Annual Disease Protection** | ₹40,56,000 | ₹1,06,31,250 | ₹1,58,76,000 |
| **Total Annual Gross Benefit** | ₹73,90,400 | ₹1,58,57,850 | ₹2,40,37,800 |
| **Less: Annual OPEX** | (₹2,50,000) | (₹2,20,000) | (₹2,00,000) |
| **Net Annual Benefit** | **₹71,40,400** | **₹1,56,37,850** | **₹2,38,37,800** |
| **Initial CAPEX** | ₹25,00,000 | ₹22,00,000 | ₹20,00,000 |
| **Payback Period** | **4.2 Months** | **1.7 Months** | **1.0 Month** |
| **Return on Investment (ROI)** | **285.6%** | **710.8%** | **1,191.9%** |

---

## 6. Conclusion
Deploying AquaIntel on a 10-hectare commercial farm yields an extraordinary payback period of **under 2 months** (within the very first production cycle), driven primarily by automated biological feeding safety and real-time viral risk prediction.
