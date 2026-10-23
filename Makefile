.PHONY: setup dev dev-backend dev-frontend test lint build migrate seed docker-up docker-down clean

# Setup development environments
setup:
	@echo "Setting up Python backend virtual environment..."
	python3 -m venv backend/venv
	backend/venv/bin/pip install --upgrade pip
	backend/venv/bin/pip install -r backend/requirements.txt
	@echo "Setting up Node.js frontend..."
	cd frontend && npm install
	@cp -n .env.example .env 2>/dev/null || true
	@echo "Setup complete. Start services using 'make dev'."

# Run both backend and frontend development servers
dev-backend:
	cd backend && venv/bin/python run.py

dev-frontend:
	cd frontend && npm run dev

# Run automated tests
test:
	@echo "Running backend test suite..."
	cd backend && venv/bin/pytest -v
	@echo "Running frontend type checks..."
	cd frontend && npm run build

# Run linting
lint:
	cd frontend && npm run lint

# Build production artifacts
build:
	cd frontend && npm run build

# Database migrations via Alembic
migrate:
	cd backend && venv/bin/alembic upgrade head

# Seed 10-pond commercial baseline data
seed:
	cd backend && venv/bin/python -c "from app.database import SessionLocal; from app.seed_data import seed_database; db = SessionLocal(); seed_database(db); db.close()"

# Docker Compose operations
docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

clean:
	rm -rf backend/venv frontend/node_modules frontend/dist
