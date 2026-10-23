# AquaIntel — Deployment & Operations Guide

This guide covers deployment options for AquaIntel, including local development, Docker Compose containerization, and production PostgreSQL configuration.

---

## 1. Quickstart (Local Development)

### Prerequisites:
- Python 3.10+ (Tested on Python 3.15)
- Node.js 18+ (Tested on Node.js v24)
- npm 9+

### Environment Setup:
```bash
cp .env.example .env
```

### Backend Startup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```
*API running on `http://localhost:8000`*

### Frontend Startup:
```bash
cd frontend
npm install
npm run dev
```
*Application running on `http://localhost:5173`*

---

## 2. Docker & Containerized Deployment

AquaIntel includes container configurations for production deployment:
- **`compose.yaml`**: Multi-container orchestrator connecting PostgreSQL 16, Mosquitto MQTT broker, FastAPI backend, and NGINX/Vite frontend.

### Launch with Docker Compose:
```bash
docker compose up -d --build
```

### Service Endpoints:
- **Frontend Web UI:** `http://localhost:3000` (or `http://localhost:5173`)
- **Backend API & Swagger:** `http://localhost:8000/docs`
- **PostgreSQL Database:** `localhost:5432`
- **Mosquitto MQTT Broker:** `localhost:1883`

---

## 3. Production PostgreSQL Migration

To switch from the default SQLite database to PostgreSQL:
1. In `.env`, set:
   ```env
   DATABASE_URL="postgresql://aquaintel_user:secure_password@localhost:5432/aquaintel_db"
   ```
2. Apply Alembic migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```
3. Seed the 10-pond commercial baseline:
   ```bash
   python -c "from app.database import SessionLocal; from app.seed_data import seed_database; db = SessionLocal(); seed_database(db); db.close()"
   ```
