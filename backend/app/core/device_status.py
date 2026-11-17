"""
AquaIntel Device Status & Telemetry Freshness Engine
Provides deterministic evaluation of IoT edge node connectivity, telemetry freshness,
hardware health, provisioning status, and multi-format timestamp normalization.
Conforms to Litopenaeus vannamei aquaculture automation standards.
"""

import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Tuple, Union

# Indian Standard Time (IST) is UTC+05:30
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

class TimestampError(ValueError):
    """Raised when an invalid, corrupted, or future timestamp is detected."""
    pass

def parse_and_normalize_timestamp(
    ts_input: Union[int, float, str, datetime, None],
    max_future_skew_seconds: float = 15.0,
    reference_now: Optional[datetime] = None
) -> Tuple[Optional[datetime], str]:
    """
    Parses and normalizes multi-format incoming timestamps into timezone-aware UTC datetime.
    
    Supported inputs:
    - Unix timestamp in seconds (integer or float, e.g. 1763378940)
    - Unix timestamp in milliseconds (integer or float, e.g. 1763378940000)
    - UTC ISO-8601 strings (e.g. '2026-11-17T12:30:00Z', '2026-11-17T12:30:00+00:00')
    - Timezone-offset strings (e.g. '2026-11-17T18:00:00+05:30', '2026-11-17T07:30:00-05:00')
    - Naive ISO strings (assumed UTC)
    - Native datetime objects (naive assumed UTC, aware converted to UTC)
    
    Returns:
        (normalized_utc_datetime, status_code)
        status_code in ['VALID', 'MISSING', 'INVALID_FORMAT', 'FUTURE_TIMESTAMP']
    """
    if ts_input is None:
        return None, "MISSING"

    now_utc = reference_now.astimezone(timezone.utc) if reference_now else datetime.now(timezone.utc)
    parsed_dt: Optional[datetime] = None

    try:
        if isinstance(ts_input, datetime):
            if ts_input.tzinfo is None:
                parsed_dt = ts_input.replace(tzinfo=timezone.utc)
            else:
                parsed_dt = ts_input.astimezone(timezone.utc)

        elif isinstance(ts_input, (int, float)):
            # Disambiguate seconds vs milliseconds:
            # Unix seconds in year ~2026 is ~1.76e9. Milliseconds is ~1.76e12.
            # Cutoff at 1e11 handles seconds up to year 5138.
            val = float(ts_input)
            if val < 0:
                return None, "INVALID_FORMAT"
            if val >= 1e11:
                # Milliseconds
                parsed_dt = datetime.fromtimestamp(val / 1000.0, tz=timezone.utc)
            else:
                # Seconds
                parsed_dt = datetime.fromtimestamp(val, tz=timezone.utc)

        elif isinstance(ts_input, str):
            clean_str = ts_input.strip()
            if not clean_str:
                return None, "MISSING"

            # Check if numeric string (e.g. "1763378940" or "1763378940000")
            try:
                numeric_val = float(clean_str)
                if numeric_val >= 1e11:
                    parsed_dt = datetime.fromtimestamp(numeric_val / 1000.0, tz=timezone.utc)
                else:
                    parsed_dt = datetime.fromtimestamp(numeric_val, tz=timezone.utc)
            except ValueError:
                # Parse as ISO string
                iso_clean = clean_str.replace("Z", "+00:00")
                parsed_dt = datetime.fromisoformat(iso_clean)
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                else:
                    parsed_dt = parsed_dt.astimezone(timezone.utc)
        else:
            return None, "INVALID_FORMAT"

    except Exception:
        return None, "INVALID_FORMAT"

    if parsed_dt is None:
        return None, "INVALID_FORMAT"

    # Future timestamp validation: detect clock skew > max_future_skew_seconds
    skew = (parsed_dt - now_utc).total_seconds()
    if skew > max_future_skew_seconds:
        return parsed_dt, "FUTURE_TIMESTAMP"

    return parsed_dt, "VALID"

def format_timestamp_ist(dt: Optional[datetime]) -> Optional[str]:
    """Formats a UTC datetime into an Asia/Kolkata (IST) ISO string."""
    if dt is None:
        return None
    utc_dt = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    ist_dt = utc_dt.astimezone(IST_TIMEZONE)
    return ist_dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")

class DeviceStatusConfig:
    """Configurable thresholds for edge device health and freshness."""
    def __init__(
        self,
        heartbeat_fresh_sec: int = 60,
        heartbeat_stale_sec: int = 300,
        telemetry_fresh_sec: int = 60,
        telemetry_stale_sec: int = 300,
        battery_critical_pct: float = 10.0,
        battery_warning_pct: float = 20.0,
        signal_rssi_critical_dbm: int = -95,
        signal_rssi_warning_dbm: int = -85
    ):
        self.heartbeat_fresh_sec = heartbeat_fresh_sec
        self.heartbeat_stale_sec = heartbeat_stale_sec
        self.telemetry_fresh_sec = telemetry_fresh_sec
        self.telemetry_stale_sec = telemetry_stale_sec
        self.battery_critical_pct = battery_critical_pct
        self.battery_warning_pct = battery_warning_pct
        self.signal_rssi_critical_dbm = signal_rssi_critical_dbm
        self.signal_rssi_warning_dbm = signal_rssi_warning_dbm

class DeviceStatusEngine:
    """
    Central evaluator that calculates 4 independent dimensions of edge device state:
    1. connectivity_status: ONLINE, STALE, OFFLINE, UNKNOWN
    2. telemetry_freshness: FRESH, STALE, MISSING, INVALID
    3. hardware_health:     HEALTHY, WARNING, FAULT, UNKNOWN
    4. provisioning_status: PROVISIONED, UNPROVISIONED, UNKNOWN
    And a composite status for backward compatibility: ONLINE, WARNING, STALE, OFFLINE, FAULT.
    """

    def __init__(self, config: Optional[DeviceStatusConfig] = None):
        self.config = config or DeviceStatusConfig()

    def evaluate(
        self,
        device: Any,
        simulator_state: Optional[Any] = None,
        reference_now: Optional[datetime] = None
    ) -> Dict[str, Any]:
        now_utc = reference_now.astimezone(timezone.utc) if reference_now else datetime.now(timezone.utc)

        # 1. Normalize Timestamps
        last_heartbeat = getattr(device, "last_heartbeat_at", None) or getattr(device, "last_seen", None)
        last_telemetry = getattr(device, "last_telemetry_at", None)

        hb_dt, hb_status = parse_and_normalize_timestamp(last_heartbeat, reference_now=now_utc)
        telem_dt, telem_status = parse_and_normalize_timestamp(last_telemetry, reference_now=now_utc)

        # Effective last_seen is the latest verified communication between heartbeat and telemetry
        effective_last_seen = None
        if hb_dt and telem_dt:
            effective_last_seen = max(hb_dt, telem_dt)
        elif hb_dt:
            effective_last_seen = hb_dt
        elif telem_dt:
            effective_last_seen = telem_dt

        diff_hb_sec = int((now_utc - hb_dt).total_seconds()) if hb_dt else None
        diff_telem_sec = int((now_utc - telem_dt).total_seconds()) if telem_dt else None
        diff_seen_sec = int((now_utc - effective_last_seen).total_seconds()) if effective_last_seen else None

        # Check simulator injections
        sim_offline = False
        sim_sensor_failure = False
        sim_stale = False
        if simulator_state:
            sim_offline = getattr(simulator_state, "is_offline", False) or getattr(simulator_state, "gateway_offline", False)
            pond_id = getattr(device, "pond_id", None)
            if pond_id and hasattr(simulator_state, "injected_events"):
                ev = simulator_state.injected_events.get(pond_id, {})
                ev_type = ev.get("type") if isinstance(ev, dict) else getattr(ev, "type", None)
                if ev_type == "SENSOR_FAILURE" or ev_type == "SENSOR_DISCONNECTION":
                    sim_sensor_failure = True
                elif ev_type == "STALE_READINGS":
                    sim_stale = True

        # Dimension 1: Connectivity Status
        if sim_offline:
            connectivity = "OFFLINE"
        elif hb_status == "FUTURE_TIMESTAMP":
            connectivity = "UNKNOWN"
        elif hb_dt is None or hb_status in ["MISSING", "INVALID_FORMAT"]:
            connectivity = "UNKNOWN"
        elif diff_hb_sec is not None:
            if diff_hb_sec <= self.config.heartbeat_fresh_sec:
                connectivity = "ONLINE"
            elif diff_hb_sec <= self.config.heartbeat_stale_sec:
                connectivity = "STALE"
            else:
                connectivity = "OFFLINE"
        else:
            connectivity = "UNKNOWN"

        # Dimension 2: Telemetry Freshness
        if sim_stale:
            telemetry_freshness = "STALE"
        elif telem_status == "FUTURE_TIMESTAMP" or telem_status == "INVALID_FORMAT":
            telemetry_freshness = "INVALID"
        elif telem_dt is None or telem_status == "MISSING":
            telemetry_freshness = "MISSING"
        elif diff_telem_sec is not None:
            if diff_telem_sec <= self.config.telemetry_fresh_sec:
                telemetry_freshness = "FRESH"
            elif diff_telem_sec <= self.config.telemetry_stale_sec:
                telemetry_freshness = "STALE"
            else:
                telemetry_freshness = "STALE"
        else:
            telemetry_freshness = "MISSING"

        # Dimension 3: Hardware Health
        battery_pct = getattr(device, "battery_pct", None)
        signal_rssi = getattr(device, "signal_rssi_dbm", None)
        reported_health = getattr(device, "hardware_health", None)

        if sim_sensor_failure or reported_health == "FAULT" or (battery_pct is not None and battery_pct <= self.config.battery_critical_pct):
            hardware_health = "FAULT"
        elif hb_status == "FUTURE_TIMESTAMP" or telem_status == "FUTURE_TIMESTAMP":
            hardware_health = "FAULT"
        elif (battery_pct is not None and battery_pct <= self.config.battery_warning_pct) or (signal_rssi is not None and signal_rssi <= self.config.signal_rssi_critical_dbm) or reported_health == "WARNING":
            hardware_health = "WARNING"
        elif battery_pct is not None:
            hardware_health = "HEALTHY"
        else:
            hardware_health = "UNKNOWN"

        # Dimension 4: Provisioning Status
        is_prov = getattr(device, "is_provisioned", True)
        if is_prov is True:
            provisioning_status = "PROVISIONED"
        elif is_prov is False:
            provisioning_status = "UNPROVISIONED"
        else:
            provisioning_status = "UNKNOWN"

        # Composite Status (Backward compatible for API and UI status badges)
        if connectivity == "OFFLINE":
            composite_status = "OFFLINE"
        elif hardware_health == "FAULT":
            composite_status = "FAULT"
        elif connectivity == "STALE":
            composite_status = "STALE"
        elif hardware_health == "WARNING":
            composite_status = "WARNING"
        elif connectivity == "ONLINE":
            composite_status = "ONLINE"
        else:
            composite_status = "UNKNOWN"

        return {
            "status": composite_status,
            "connectivity_status": connectivity,
            "telemetry_freshness": telemetry_freshness,
            "hardware_health": hardware_health,
            "provisioning_status": provisioning_status,
            "last_seen_seconds_ago": max(0, diff_seen_sec) if diff_seen_sec is not None else None,
            "last_heartbeat_seconds_ago": max(0, diff_hb_sec) if diff_hb_sec is not None else None,
            "last_telemetry_seconds_ago": max(0, diff_telem_sec) if diff_telem_sec is not None else None,
            "last_seen_iso": effective_last_seen.isoformat() if effective_last_seen else None,
            "last_seen_ist": format_timestamp_ist(effective_last_seen),
            "last_heartbeat_iso": hb_dt.isoformat() if hb_dt else None,
            "last_heartbeat_ist": format_timestamp_ist(hb_dt),
            "last_telemetry_iso": telem_dt.isoformat() if telem_dt else None,
            "last_telemetry_ist": format_timestamp_ist(telem_dt)
        }

device_status_engine = DeviceStatusEngine()
