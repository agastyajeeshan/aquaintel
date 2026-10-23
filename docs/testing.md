# AquaIntel — Automated Testing & Quality Assurance Guide

AquaIntel includes comprehensive multi-tier automated test suites verifying database models, authentication, telemetry ingestion, safety state machines, API endpoints, and frontend production builds.

---

## 1. Test Architecture

- **Backend Unit & Integration Testing:** Pytest + FastAPI TestClient (`backend/tests/`)
  - `test_foundation.py`: Database connection, seed dataset verification (10 ponds, 70 sensors, 40 aerators, 10 feeders), dual health check endpoints (`/health` and `/api/health`), and simulator endpoints.
  - `test_phase2_core.py`: Versioned API routing (`/api/v1`), JWT authentication, password reset workflow, telemetry deduplication, physical out-of-bounds anomaly rejection, actuator command expiration, and pond CRUD.
- **Frontend Static Analysis & Type Checking:**
  - `tsc -b`: Strict TypeScript compiler validation.
  - `oxlint`: High-performance static analysis.
  - `vite build`: Production bundler verifying complete module resolution.

---

## 2. Running Automated Tests

### Backend Test Suite
```bash
cd backend
source venv/bin/activate  # Or venv\Scripts\activate on Windows
pytest -v
```

### Run Specific Test Modules
```bash
pytest -v tests/test_foundation.py
pytest -v tests/test_phase2_core.py
```

### Frontend Build & Typecheck
```bash
cd frontend
npm run build
npm run lint
```
