# AQUAINTEL
### AI-Powered Autonomous Prawn Farming and Disease Risk Management System
**Tagline:** *Sense Smart. Predict Early. Farm Better.*  
*Engineered for a 10-Hectare Commercial Penaeus vannamei Facility in Nellore, Andhra Pradesh, India*

---

## 🌟 Executive Overview & Core Principle

**AquaIntel** is a complete, modular, and maintainable aquaculture engineering platform that monitors prawn farm conditions, supports intelligent feeding decisions, automates aeration according to water-quality conditions, identifies anomalies, estimates disease risk, and enables centralized management of multiple ponds.

The system's core automation workflow is defined by:
```
SENSE ──► VALIDATE ──► ANALYZE ──► PREDICT ──► DECIDE ──► ACT ──► VERIFY
```

> **Target Deployment Distinction:** The 10-hectare commercial model (10 individual 1-hectare ponds) is the target use case and design reference, accompanied by a small college prototype and fully functional simulation environment for rapid testing and zero-hardware demonstration. Real and simulated data are strictly distinguished.

---

## 🏗️ Technology Stack

### Backend
- **Framework:** Python 3.13, FastAPI (Asynchronous high-performance REST APIs)
- **Data Validation & Schemas:** Pydantic v2
- **Database & ORM:** PostgreSQL / SQLite ready via SQLAlchemy 2.0 (Zero-config out-of-the-box launcher with pre-seeded 10-pond fleet)
- **Real-Time Telemetry:** WebSockets (`/ws/telemetry`) streaming high-frequency sensor snapshots every 3 seconds
- **AI & Analytics:** NumPy, Scikit-learn, OpenCV (Computer Vision for check-tray feed clearing & shrimp activity)
- **Security:** Bcrypt password hashing, JWT bearer tokens, Role-Based Access Control (RBAC)

### Frontend
- **Framework:** React 19, TypeScript, Vite
- **Styling:** Vanilla Tailwind CSS with custom Aquaculture Light Theme (`#f8fafc` off-white, `#0f5132` deep forest green, `#0d9488` aqua/teal, `#0284c7` ocean blue)
- **Component Architecture:** Reusable card systems, soft shadows, rounded borders, clean typography
- **Data Visualization:** Recharts (Interactive multi-axis time series, 24h / 7d / 30d filters, biomass & energy bar charts)
- **Icons:** Lucide Icons

---

## 🗺️ Application Architecture & Page Modules

AquaIntel comprises **16 operational modules**:

1. **Command Center Dashboard:** High-level farm KPIs (10 ponds, 8 healthy, 1 warning, 1 critical, 12,450 kg biomass, 384 kg today's feed, 395 kWh electricity), 10 pond fleet status grid, and active alarm ticker.
2. **Ponds Fleet Management:** Visual status cards for all 10 ponds with color badges (`GREEN = Healthy`, `YELLOW = Warning`, `ORANGE = High Risk`, `RED = Critical`), live parameters (DO, Temp, pH, Ammonia, Salinity), and aerator/feeder statuses.
3. **Pond Detail Deep-Dive:** Comprehensive individual pond diagnostics with interactive Recharts time series (DO, Temp, pH, Ammonia, Salinity, Secchi depth), time range toggles (24 Hours, 7 Days, 30 Days), and direct remote actuator toggles.
4. **Water Quality Intelligence:** Multi-pond telemetry comparison matrix, biological threshold safety reference (*Litopenaeus vannamei* standards), and CSV dataset export.
5. **Smart Feeding Engine:** Biomass-driven nutrition model, today's feed vs recommended feed, FCR tracking, explainable safety interlock box (*"Why was feeding reduced? DO below preferred level"*), and feeder actuator controls (**START**, **STOP**, **SCHEDULE**, **OVERRIDE**).
6. **Automated Aeration & Power:** Multi-stage DO hysteresis algorithm (*Minimum 10-minute ON/OFF anti-cycle motor protection*), runtime hours, kWh tracking, electricity tariff calculations (₹7.50 / kWh), and emergency boost mode.
7. **Disease Risk Intelligence:** Explainable AI-based risk models for **WSSV** (White Spot), **Vibriosis**, and **EMS/AHPND**, transparent additive stressor point breakdown (+25 low DO, +20 temp drop, +30 high ammonia), agronomic action steps, and prominent veterinary PCR disclaimer.
8. **Computer Vision Inspection:** Check-tray feeding inspection, optical detection of shrimp activity vigor, uneaten pellet count, tray clearance %, dead shrimp identification, bounding box HUD overlay, and clinical disclaimer.
9. **IoT Devices & Network:** 30 edge nodes (ESP32-Pond-Master nodes, LoRa Gateway 865.2 MHz, Multi-Probe Sensor buoys, Feeder RTUs), battery levels, RSSI signal dBm, firmware versions, and node provisioning modal.
10. **Alert Management Center:** Multi-tier alarm registry (Low DO, High Ammonia, Thermal Shock, Sensor Failure), severity filters, and **Acknowledge**, **Resolve**, and **Ignore** actions.
11. **Production Analytics:** Multi-cycle growth rates (g/week), FCR benchmarking (1.24 vs 1.65 industry baseline), and energy source breakdown (Grid, Solar Microgrid, Silent DG Set).
12. **ROI & Commercial Viability:** Complete 10-hectare financial model: initial CAPEX (₹22 Lakhs), annual OPEX (₹2.2 Lakhs), feed savings (₹41.25 Lakhs), energy savings (₹3.24 Lakhs), disease loss prevention (₹1.06 Crores), net benefit (₹1.56 Crores/yr), payback period (1.7 Months), and interactive Conservative / Base / Optimistic scenario sliders.
13. **Farm Asset Management:** Farm profile, stocking batches, species (*L. vannamei*), stocking density (45 PL/m²), feed warehouse inventory, and 24/7 technical team roster.
14. **Equipment Maintenance:** Scheduled preventive maintenance for aerator gearboxes, optical DO membrane calibrations, silent DG set oil servicing, and technician sign-offs.
15. **Compliance Reports:** Daily farm operational reports, biological census tables, print-friendly view, and CSV export.
16. **System Settings & RBAC:** Sensor thresholds, aeration hysteresis duration, notification channels (In-app, Email, SMS, WhatsApp), and role-based user management (**ADMIN**, **FARM MANAGER**, **OPERATOR**, **VIEWER**).

---

## 🧪 IoT Sensor Simulator & Event Injection

To test and demonstrate automation failovers without physical hardware:
1. Click **"Simulate Event"** in the top navigation bar.
2. Select target pond (Pond 01 – 10).
3. Inject simulated stress events:
   - **Low DO Event (< 3.0 mg/L):** Triggers emergency full aeration and halts automated feeding dispensers.
   - **High Ammonia Spike (> 0.18 mg/L):** Triggers biological warning alert and cuts feed ration by 50%.
   - **Temperature Spike (34.8°C):** Simulates midday solar heat wave and engages deep-water circulation jet aerators.
   - **Sensor Failure:** Simulates telemetry loss and initiates conservative safety interlocks.
   - **Reset All Ponds:** Restores natural sinusoidal diurnal curves (photosynthesis DO curves & solar thermal cycles).

---

## 📶 Simulated Offline Operation & Queue Sync

Click the **"ONLINE / OFFLINE"** button in the top navigation bar to simulate connectivity loss:
- The edge engine continues local sensor simulation, feeding safety cutoffs, and aerator hysteresis without internet.
- A notification banner displays **"OFFLINE MODE ACTIVATED — X records waiting for synchronization"**.
- Toggling back to **ONLINE** simulates instantaneous edge-to-cloud synchronization and resets the queue.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ (Tested on Node.js v24)
- npm 9+

### 1. Start the Backend API Service
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows
pip install -r requirements.txt
python run.py
```
*The backend API will start on `http://localhost:8000`. Swagger API documentation is available at `http://localhost:8000/docs`.*

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
*Open your browser and navigate to `http://localhost:5173` to access the full AquaIntel platform.*

### 3. Containerized Deployment (Docker Compose)
```bash
docker compose up -d --build
```

---

## 📚 Comprehensive Engineering Documentation

Detailed architecture specifications and technical guides are available in the [`docs/`](file:///Users/jeeshan/Documents/projects/aquaintel/docs) directory:
- [System Architecture](file:///Users/jeeshan/Documents/projects/aquaintel/docs/architecture.md): High-level topology, data workflows, and decoupled microservice boundaries.
- [REST & WebSocket API Reference](file:///Users/jeeshan/Documents/projects/aquaintel/docs/api.md): Versioned `/api/v1` routes, auth, telemetry ingestion, and commands.
- [Database Architecture](file:///Users/jeeshan/Documents/projects/aquaintel/docs/database.md): Entity relationship schemas, indexes, and Alembic migrations.
- [AI & Machine Learning](file:///Users/jeeshan/Documents/projects/aquaintel/docs/ai-models.md): Anomaly detection, disease vulnerability scoring, and feature schemas.
- [IoT & Edge Integration](file:///Users/jeeshan/Documents/projects/aquaintel/docs/iot-integration.md): LoRa 865.2 MHz RF parameters, MQTT schemas, and offline state machine.
- [Automation Safety & Interlocks](file:///Users/jeeshan/Documents/projects/aquaintel/docs/safety.md): Priority hierarchy, anti-cycle motor hysteresis, and feeding cutoffs.
- [Automated Testing](file:///Users/jeeshan/Documents/projects/aquaintel/docs/testing.md): Pytest backend suites and frontend type-checking.
- [Deployment & Operations](file:///Users/jeeshan/Documents/projects/aquaintel/docs/deployment.md): Docker Compose, PostgreSQL setup, and production checklist.

---

## 🔑 Demo Login Credentials
- **Admin:** `admin` / `admin123` (Dr. K. Srinivas — Chief Agritech Director)
- **Farm Manager:** `manager` / `farm123` (V. Naresh — General Farm Manager)
- **Operator:** `operator` / `operator123` (B. Venkat — Shift Supervisor)
- **Viewer / Investor:** `viewer` / `viewer123` (Rajiv Menon — Aquaculture Analyst)

*(Quick 1-click demo role switching is also available directly in the Settings and Login interfaces!)*

