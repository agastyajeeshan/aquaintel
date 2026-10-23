# AQUAINTEL — Development & Engineering Guide
### Smart Prawn Farm Automation & AI-Based Disease Risk Management
*Operational Architecture for a 10-Hectare Commercial Penaeus vannamei Farm in Nellore, Andhra Pradesh, India*

---

## 1. System Architecture Overview

AquaIntel is engineered as a decoupled modern full-stack platform:
- **Backend Service:** Asynchronous FastAPI REST API engine running on Python 3.10+ with SQLAlchemy 2.0 ORM, WebSocket telemetry broadcaster, and AI/mathematical inference engines (disease risk modeling, aeration hysteresis, feeding optimization, computer vision check-tray inspection).
- **Frontend Service:** React 19 single-page application built with TypeScript, Vite, Tailwind CSS, Lucide icons, and Recharts visualization.
- **Data Persistence:** SQLAlchemy 2.0 abstraction supporting local SQLite (zero-config development) and high-throughput PostgreSQL for production deployment.

```
┌─────────────────────────────────────────────────────────────┐
│                    AquaIntel Frontend                       │
│     React 19 + TypeScript + Vite + Tailwind CSS             │
│        (Command Center, Fleet, Analytics, ROI)              │
└─────────────────────────▲───────────────────────────────────┘
                          │ HTTP REST & WebSocket (ws://)
┌─────────────────────────▼───────────────────────────────────┐
│                     FastAPI Backend                         │
│   - Telemetry Streamer (/ws/telemetry)                      │
│   - Health Checks (/health, /api/health)                    │
│   - Core Engines (Feeding, Aeration, Disease AI, CV)        │
│   - 15 Operational Routers                                  │
└─────────────────────────▲───────────────────────────────────┘
                          │ SQLAlchemy 2.0
┌─────────────────────────▼───────────────────────────────────┐
│                     Database Layer                          │
│   SQLite (Default: aquaintel.db) / PostgreSQL (Production)  │
│   10 Ponds, 70 Probes, 40 Aerators, 10 Feeders, 11 IoT Hubs │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

Ensure the following tools are installed on your host system:
- **Python:** 3.10 or higher (Verified on Python 3.15.1)
- **Node.js:** 18 or higher (Verified on Node.js v24.22.1)
- **npm:** 9 or higher (Verified on npm 11.19.1)
- **Git**

---

## 3. Environment Configuration

1. Copy `.env.example` to create `.env` in the repository root:
   ```bash
   cp .env.example .env
   ```
2. Configure settings as needed:
   - `DATABASE_URL`: Defaults to `sqlite:///./aquaintel.db`. For PostgreSQL, set to `postgresql://<user>:<password>@<host>:5432/<dbname>`.
   - `SECRET_KEY`: JWT signing secret.
   - `FARM_TOTAL_HECTARES`: Defaults to `10.0`.
   - `TOTAL_PONDS`: Defaults to `10`.
   - `LORA_FREQUENCY_MHZ`: Defaults to `865.2` (Indian IN865 band).

---

## 4. Backend Setup & Startup

### Step 1: Create and Activate Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# or on Windows: venv\Scripts\activate
```

### Step 2: Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Run Backend Server
```bash
python run.py
# or directly via uvicorn:
# uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **API Base URL:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`
- **WebSocket Telemetry Stream:** `ws://localhost:8000/ws/telemetry`

---

## 5. Frontend Setup & Startup

### Step 1: Install Node Dependencies
```bash
cd frontend
npm install
```

### Step 2: Run Frontend Development Server
```bash
npm run dev
```

- **Application URL:** `http://localhost:5173`

### Step 3: Production Build
```bash
npm run build
```
Generates production assets in `frontend/dist/`.

---

## 6. Health Checks & Verification

AquaIntel includes comprehensive dual health check endpoints:
- `GET /health`
- `GET /api/health`

### Sample Health Check Response:
```json
{
  "status": "HEALTHY",
  "service": "AquaIntel Backend API",
  "version": "1.0.0",
  "database": {
    "status": "CONNECTED",
    "dialect": "sqlite",
    "ponds_seeded": 10
  },
  "system": {
    "demo_mode": true,
    "farm_total_hectares": 10.0,
    "total_ponds": 10
  },
  "timestamp": "2026-10-23T06:30:18.444264+00:00"
}
```

Verify via curl:
```bash
curl -s http://localhost:8000/api/health
```

---

## 7. Automated Testing

### Backend Test Suite
Run the automated test suite using pytest inside the `backend/` directory with the virtual environment activated:
```bash
cd backend
venv/bin/pytest -v
```

Tests verify:
- Database connectivity (`SELECT 1`)
- Table integrity and 10-pond seed dataset (70 sensors, 40 aerators, 10 feeders, 11 IoT controllers, 4 default users)
- Dual health check endpoints (`/health` and `/api/health`)
- Root operational status endpoint (`/`)
- Aggregate farm overview KPIs (`/api/farms/overview`)
- Fleet pond status and water quality matrix (`/api/ponds`)
- IoT telemetry simulator status (`/api/simulator/status`)

### Frontend Verification
```bash
cd frontend
npm run build   # Type-check and Vite bundle
npm run lint    # Oxlint static analysis
```

---

## 8. Demo User Accounts

| Role | Username | Password | User Name & Designation |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Dr. K. Srinivas (Agritech Director) |
| **Farm Manager** | `manager` | `farm123` | V. Naresh (Farm General Manager) |
| **Operator** | `operator` | `operator123` | B. Venkat (Shift Field Lead) |
| **Viewer** | `viewer` | `viewer123` | Rajiv Menon (Aquaculture Analyst) |
