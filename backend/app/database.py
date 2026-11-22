from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

# If sqlite, use connect_args check_same_thread=False
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema_migrations():
    """Applies additive column migrations and integrity cleanup for relational databases."""
    try:
        with engine.begin() as conn:
            # Check users table columns
            result = conn.execute(text("PRAGMA table_info(users)"))
            cols = [row[1] for row in result.fetchall()]
            if cols and "farm_id" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN farm_id INTEGER REFERENCES farms(id)"))

            # Check iot_devices table columns
            dev_exists = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='iot_devices'")
            ).fetchone()
            if dev_exists:
                dev_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(iot_devices)")).fetchall()]
                if "last_heartbeat_at" not in dev_cols:
                    conn.execute(text("ALTER TABLE iot_devices ADD COLUMN last_heartbeat_at DATETIME"))
                if "last_telemetry_at" not in dev_cols:
                    conn.execute(text("ALTER TABLE iot_devices ADD COLUMN last_telemetry_at DATETIME"))
                if "hardware_health" not in dev_cols:
                    conn.execute(text("ALTER TABLE iot_devices ADD COLUMN hardware_health VARCHAR(30) DEFAULT 'HEALTHY'"))
                if "is_provisioned" not in dev_cols:
                    conn.execute(text("ALTER TABLE iot_devices ADD COLUMN is_provisioned BOOLEAN DEFAULT 1"))

            # Check alerts table columns for multi-entity / gateway alert identity
            alerts_exists = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='alerts'")
            ).fetchone()
            if alerts_exists:
                alert_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(alerts)")).fetchall()]
                if "device_id" not in alert_cols:
                    conn.execute(text("ALTER TABLE alerts ADD COLUMN device_id VARCHAR(64)"))

            # Clean up orphaned feeders pointing to deleted/non-existent ponds and enforce unique feeder_code
            feeders_exists = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='feeders'")
            ).fetchone()
            if feeders_exists:
                conn.execute(
                    text(
                        "DELETE FROM feeding_logs WHERE feeder_id IN "
                        "(SELECT id FROM feeders WHERE pond_id NOT IN (SELECT id FROM ponds))"
                    )
                )
                conn.execute(
                    text("DELETE FROM feeders WHERE pond_id NOT IN (SELECT id FROM ponds)")
                )
                conn.execute(
                    text(
                        "DELETE FROM feeding_logs WHERE feeder_id IN ("
                        "SELECT id FROM feeders WHERE id NOT IN "
                        "(SELECT MIN(id) FROM feeders GROUP BY feeder_code)"
                        ")"
                    )
                )
                conn.execute(
                    text(
                        "DELETE FROM feeders WHERE id NOT IN "
                        "(SELECT MIN(id) FROM feeders GROUP BY feeder_code)"
                    )
                )
                conn.execute(
                    text(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ix_feeders_feeder_code_unique "
                        "ON feeders (feeder_code)"
                    )
                )
    except Exception:
        pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
