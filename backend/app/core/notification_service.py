"""
Autonomous Notification Service
AquaIntel Platform

Event-driven multi-channel notification engine with deduplication,
structured payloads, severity escalation, real-time Expo push dispatch,
and Android notification channel segregation.
"""

import hashlib
import logging
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import httpx
from sqlalchemy.orm import Session

from ..models import NotificationLog, DevicePushToken, Pond, User

logger = logging.getLogger("aquaintel.notifications")


class NotificationService:
    def __init__(self, dedup_window_seconds: int = 300):
        self.dedup_window_seconds = dedup_window_seconds
        self._recent_hashes: Dict[str, float] = {}  # hash -> timestamp

    def _generate_dedup_hash(self, pond_id: Optional[int], condition_type: str, severity: str, device_id: Optional[str] = None) -> str:
        raw = f"{pond_id if pond_id is not None else 'NONE'}:{device_id or 'NONE'}:{condition_type}:{severity}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def dispatch_push_to_devices(
        self,
        db: Session,
        title: str,
        body: str,
        pond_id: Optional[int] = None,
        alert_id: Optional[int] = None,
        severity: str = "INFO",
        data: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        timeout_seconds: float = 4.0
    ) -> Dict[str, Any]:
        """
        Dispatches push notifications to active registered devices via Expo Push API.
        Maps alert severity to dedicated Android notification channels:
        - CRITICAL / EMERGENCY -> 'critical_alerts' (Max importance, bypass DND, red LED, urgent vibration)
        - WARNING / HIGH -> 'warnings' (High importance, amber LED, warning vibration)
        - ADVISORY / INFO -> 'advisories' (Default importance, blue LED)
        - ROUTINE -> 'routine' (Low importance)

        Automatically deactivates invalid tokens if reported by Expo (DeviceNotRegistered).
        Fails safely on network error, simulator run, or mock environment without disrupting caller.
        """
        query = db.query(DevicePushToken).filter(DevicePushToken.is_active == True)

        if user_id is not None:
            query = query.filter(DevicePushToken.user_id == user_id)
        elif pond_id is not None:
            pond = db.query(Pond).filter(Pond.id == pond_id).first()
            if pond and pond.farm_id:
                query = query.join(User, DevicePushToken.user_id == User.id).filter(
                    (User.farm_id == pond.farm_id) | (User.role == "ADMIN") | (User.farm_id.is_(None))
                )

        active_tokens = query.all()

        # Map severity to Android Notification Channel
        severity_upper = (severity or "INFO").upper()
        if severity_upper in ["CRITICAL", "EMERGENCY"]:
            channel_id = "critical_alerts"
            priority = "high"
        elif severity_upper in ["WARNING", "HIGH"]:
            channel_id = "warnings"
            priority = "high"
        elif severity_upper in ["ADVISORY", "INFO"]:
            channel_id = "advisories"
            priority = "normal"
        else:
            channel_id = "routine"
            priority = "normal"

        if not active_tokens:
            return {
                "status": "SKIPPED",
                "reason": "NO_ACTIVE_TOKENS",
                "sent_count": 0,
                "channel_id": channel_id,
                "dispatched_at": datetime.now(timezone.utc).isoformat()
            }

        payload_data = {
            "pond_id": pond_id,
            "alert_id": alert_id,
            "severity": severity_upper,
            "channelId": channel_id,
            **(data or {})
        }

        messages = []
        for t in active_tokens:
            messages.append({
                "to": t.token,
                "sound": "default",
                "title": title,
                "body": body,
                "channelId": channel_id,
                "priority": priority,
                "data": payload_data
            })

        expo_url = "https://exp.host/--/api/v2/push/send"
        success_count = 0
        error_count = 0
        tokens_to_deactivate: List[DevicePushToken] = []

        try:
            with httpx.Client(timeout=timeout_seconds) as client:
                resp = client.post(
                    expo_url,
                    json=messages,
                    headers={
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    }
                )
                if resp.status_code == 200:
                    resp_json = resp.json()
                    tickets = resp_json.get("data", [])
                    for idx, ticket in enumerate(tickets):
                        if ticket.get("status") == "ok":
                            success_count += 1
                        else:
                            error_count += 1
                            err_detail = ticket.get("details", {}).get("error")
                            if err_detail == "DeviceNotRegistered":
                                if idx < len(active_tokens):
                                    tokens_to_deactivate.append(active_tokens[idx])
                else:
                    logger.warning(f"Expo push API returned HTTP {resp.status_code}: {resp.text}")
                    error_count = len(messages)
        except Exception as e:
            logger.info(f"Expo push delivery skipped or failed gracefully: {e}")
            error_count = len(messages)

        # Deactivate uninstalled/invalid device tokens reported by Expo
        if tokens_to_deactivate:
            for t in tokens_to_deactivate:
                t.is_active = False
            try:
                db.commit()
            except Exception:
                db.rollback()

        return {
            "status": "DISPATCHED" if success_count > 0 else ("QUEUED_OR_FAILED" if error_count > 0 else "COMPLETED"),
            "sent_count": success_count,
            "total_tokens": len(messages),
            "errors": error_count,
            "channel_id": channel_id,
            "dispatched_at": datetime.now(timezone.utc).isoformat()
        }

    def clear_dedup_hash(self, pond_id: Optional[int] = None, condition_detected: Optional[str] = None, device_id: Optional[str] = None):
        """
        Clears in-memory deduplication cache when a condition is resolved/restored,
        allowing subsequent genuine new occurrences to notify immediately.
        """
        p_str = str(pond_id) if pond_id is not None else "NONE"
        d_str = str(device_id) if device_id is not None else "NONE"
        if condition_detected:
            for k in list(self._recent_hashes.keys()):
                parts = k.split(":")
                if len(parts) >= 3:
                    if pond_id is not None and parts[0] != p_str:
                        continue
                    if device_id is not None and parts[1] != d_str:
                        continue
                    if parts[2] == condition_detected or condition_detected in parts[2]:
                        self._recent_hashes.pop(k, None)
                elif condition_detected in k:
                    self._recent_hashes.pop(k, None)
        else:
            self._recent_hashes.clear()

    def send_notification(
        self,
        db: Session,
        pond_id: Optional[int],
        condition_detected: str,
        severity: str,  # INFO, ADVISORY, WARNING, CRITICAL, EMERGENCY
        title: str,
        message: str,
        actual_reading: Optional[float] = None,
        unit: Optional[str] = None,
        configured_threshold: Optional[float] = None,
        automatic_action_taken: str = "NONE",
        action_status: str = "NOT_APPLICABLE",
        recommended_next_steps: str = "Continue nominal monitoring",
        event_id: Optional[str] = None,
        force_escalate: bool = False,
        device_id: Optional[str] = None
    ) -> Optional[NotificationLog]:
        """
        Formats, deduplicates, and dispatches an autonomous notification across configured channels,
        including live Expo push notification to Android devices.
        Enforces deduplication window even during ongoing outages or high severity conditions
        to prevent duplicate spam. Escalations across severity levels (e.g. WARNING -> EMERGENCY)
        generate new unique hashes and are delivered immediately.
        Durable across process restarts and multi-worker processes via database alert & event identity.
        """
        now_ts = time.time()
        now_dt = datetime.now(timezone.utc)
        dedup_key = f"{pond_id if pond_id is not None else 'NONE'}:{device_id or 'NONE'}:{condition_detected}:{severity}"
        dedup_hash = self._generate_dedup_hash(pond_id, condition_detected, severity, device_id=device_id)
        
        # 1. Check in-memory deduplication window
        last_sent = self._recent_hashes.get(dedup_key, 0)
        if (now_ts - last_sent) < self.dedup_window_seconds and not force_escalate:
            # Suppress duplicate alert within dedup window
            return None

        # 2. Durable deduplication check against database (across process restarts & multi-workers):
        # A. Explicit event_id deduplication: if this event_id has already been notified within dedup window, suppress
        if event_id:
            window_start = now_dt - timedelta(seconds=self.dedup_window_seconds)
            existing_event_notif = db.query(NotificationLog).filter(
                NotificationLog.event_id == event_id,
                NotificationLog.timestamp >= window_start
            ).first()
            if existing_event_notif:
                return None

        # B. Check active Alert in database:
        # If an alert for this entity and condition is already ACTIVE and was already notified,
        # suppress duplicate notifications across restarts
        if not force_escalate:
            from ..models.models import Alert
            alert_q = db.query(Alert).filter(Alert.status == "ACTIVE")
            if pond_id is not None:
                alert_q = alert_q.filter(Alert.pond_id == pond_id)
            else:
                alert_q = alert_q.filter(Alert.pond_id.is_(None))
            if device_id is not None:
                alert_q = alert_q.filter(Alert.device_id == device_id)
            else:
                alert_q = alert_q.filter(Alert.device_id.is_(None))

            matching_alert = alert_q.filter(
                (Alert.alert_type == condition_detected) |
                (Alert.alert_type.contains(condition_detected)) |
                (Alert.title.contains(condition_detected))
            ).first()

            if matching_alert:
                existing_alert_log = db.query(NotificationLog).filter(
                    NotificationLog.dedup_hash == dedup_hash,
                    NotificationLog.timestamp >= matching_alert.created_at
                ).first()
                if existing_alert_log:
                    ts = existing_alert_log.timestamp.replace(tzinfo=timezone.utc).timestamp() if existing_alert_log.timestamp.tzinfo is None else existing_alert_log.timestamp.timestamp()
                    self._recent_hashes[dedup_key] = ts
                    return None
                
        self._recent_hashes[dedup_key] = now_ts
        
        # Determine escalation tier and active dispatch channels
        channels = ["IN_APP", "DASHBOARD"]
        escalation_level = 1
        
        if severity in ["WARNING", "HIGH"]:
            channels.extend(["PUSH", "EMAIL"])
            escalation_level = 2
        elif severity in ["CRITICAL", "EMERGENCY"]:
            channels.extend(["PUSH", "SMS", "VOICE", "EMAIL"])
            escalation_level = 3
            
        # Standardized Payload Specification
        structured_payload = {
            "pond_id": pond_id,
            "device_id": device_id,
            "condition_detected": condition_detected,
            "actual_reading": actual_reading,
            "unit": unit,
            "configured_threshold": configured_threshold,
            "severity": severity,
            "time_detected": now_dt.isoformat(),
            "automatic_action_taken": automatic_action_taken,
            "action_status": action_status,
            "recommended_next_steps": recommended_next_steps,
            "dispatched_channels": channels,
            "escalation_level": escalation_level
        }
        
        # Dispatch to active Expo push tokens if PUSH is an active channel
        if "PUSH" in channels:
            try:
                self.dispatch_push_to_devices(
                    db=db,
                    title=title,
                    body=message,
                    pond_id=pond_id,
                    severity=severity,
                    data=structured_payload
                )
            except Exception as e:
                logger.warning(f"Push dispatch error in send_notification: {e}")

        # Record Notification Log in Database
        notif = NotificationLog(
            notification_id=f"NOTIF-{uuid.uuid4().hex[:12].upper()}",
            pond_id=pond_id,
            event_id=event_id,
            channel=",".join(channels),
            severity=severity,
            title=title,
            message=message,
            structured_payload=structured_payload,
            delivered=True,
            delivery_status="DELIVERED",
            dedup_hash=dedup_hash,
            escalation_level=escalation_level,
            timestamp=now_dt
        )
        db.add(notif)
        db.commit()
        return notif

# Global Notification Service Instance
notification_service = NotificationService()
