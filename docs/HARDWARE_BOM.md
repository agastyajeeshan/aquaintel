# AQUAINTEL: HARDWARE BILL OF MATERIALS (BOM)
### 10-Hectare Commercial Prawn Farm Deployment (Nellore, AP, India)

This Bill of Materials specifies all physical IoT telemetry, communication, actuator, and power backup hardware required for automating a 10-hectare (10 x 1 Ha ponds) commercial shrimp farm.

---

## 1. Pond-Level Sensing & Telemetry (Per Pond × 10 Ponds)

| Item # | Part Description | Specs / Model | Qty/Pond | Total (10 Ponds) | Unit Est. (₹) |
|---|---|---|---|---|---|
| **S-01** | Optical Dissolved Oxygen (DO) Probe | Luminescent Optical DO Sensor, RS485 Modbus, 0–20 mg/L, ±0.1 mg/L accuracy, Submersible IP68 | 1 | 10 | 45,000 |
| **S-02** | Industrial Combination pH Probe | Gel-filled polymer electrolyte, ceramic junction, RS485 Modbus, pH 0–14, IP68 | 1 | 10 | 12,000 |
| **S-03** | Submersible Water Temperature Sensor | PT100 Class A RTD, Stainless Steel 316L sheath, integrated RS485 transmitter | 1 | 10 | 4,500 |
| **S-04** | Toroidal Inductive Salinity / EC Sensor | Inductive electrodeless conductivity probe, 0–50 ppt salinity, anti-fouling | 1 | 10 | 18,000 |
| **S-05** | Ion-Selective Electrode Ammonia (TAN) | Ammonium/Ammonia ISE probe with reference electrode, 0.01–10 mg/L | 1 | 10 | 28,000 |
| **S-06** | Ultrasonic Pond Water Level Sensor | 20–200 cm range, IP67 sealed, 1mm resolution, 4-20mA / Modbus | 1 | 10 | 6,500 |
| **T-01** | Solar-Powered Pond RTU Master Node | ESP32-WROOM-32E MCU, SX1262 LoRa module (865 MHz), 40W Monocrystalline PV panel, 12V 18Ah LiFePO4 battery pack, IP67 enclosure | 1 | 10 | 14,000 |
| **T-02** | Floating Sensor Buoy & Mooring Rig | Marine-grade UV-resistant HDPE buoy with anti-vortex probe guard cage | 1 | 10 | 8,000 |

---

## 2. Central LoRaWAN Gateway & Network Infrastructure

| Item # | Part Description | Specs / Model | Qty | Unit Est. (₹) | Total (₹) |
|---|---|---|---|---|---|
| **GW-01** | Outdoor Industrial 8-Channel LoRa Gateway | Semtech SX1302 Concentrator, IN865 Band (865–867 MHz), IP67, POE + 4G LTE Cat-4 failover, 5.8 dBi omnidirectional fiberglass antenna | 1 | 65,000 | 65,000 |
| **GW-02** | Gateway Solar + Battery Backup Unit | 80W PV Solar panel + 12V 40Ah LiFePO4 battery + MPPT charge controller | 1 | 22,000 | 22,000 |
| **GW-03** | Galvanized Lightning & Mast Rig | 9-meter guyed galvanized steel mast with lightning arrestor & copper grounding rod | 1 | 18,000 | 18,000 |

---

## 3. Automated Feeders & Aeration Actuators

| Item # | Part Description | Specs / Model | Qty | Unit Est. (₹) | Total (₹) |
|---|---|---|---|---|---|
| **ACT-01** | Smart Solar Automated Feeder | 120 kg HDPE conical hopper, 12V DC vibration feed spreader (15m radius), integrated load cell, RS485 RTU controller | 10 | 52,000 | 5,20,000 |
| **ACT-02** | Paddlewheel Aerators (4-blade, 2HP) | 1.5 kW high-efficiency helical gearbox motor, 304 SS shaft, nylon impellers | 20 | 38,000 | 7,60,000 |
| **ACT-03** | Long-Arm Spiral Jet Aerators (3HP) | 2.2 kW deep-water circulation jet aerator | 10 | 44,000 | 4,40,000 |
| **ACT-04** | Submersible Venturi Oxygen Injectors | 1.5 kW high-shear micro-bubble injector | 10 | 32,000 | 3,20,000 |
| **ACT-05** | Smart Aerator Control Panels with VFD | Dual Schneider Electric Altivar VFDs, contactor bypass, Modbus RTU, anti-short-cycle delay | 10 | 48,000 | 4,80,000 |

---

## 4. Central Edge Computing & Electrical Backup

| Item # | Part Description | Specs / Model | Qty | Unit Est. (₹) | Total (₹) |
|---|---|---|---|---|---|
| **SRV-01** | On-Premises Industrial Edge Computer | Intel Core i5 fanless industrial PC, 16GB RAM, 512GB NVMe SSD, Dual Gigabit LAN, Linux/Docker running AquaIntel local stack | 1 | 85,000 | 85,000 |
| **PWR-01** | Silent Diesel Generator (DG Set) | Kirloskar / Cummins 125 kVA Silent DG Set, 415V 3-Phase, auto-mains failure (AMF) panel | 1 | 6,50,000 | 6,50,000 |
| **PWR-02** | Solar Hybrid Microgrid | 40 kW Ground-mounted solar array + 50 kVA hybrid inverter for daytime aerator baseload | 1 | 18,00,000 | 18,00,000 |

---

## 5. Summary Hardware Investment
- **IoT Sensing & Telemetry Subtotal:** ₹13,60,000
- **Gateway & Radio Subtotal:** ₹1,05,000
- **Actuators & Control Subtotal:** ₹25,20,000
- **Edge Computing & Software Subtotal:** ₹1,45,000
- **Power Generation & Solar Subtotal (Optional Infrastructure):** ₹24,50,000
