from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from src.clients.openf1 import OpenF1Client
from src.config import Settings


@dataclass(frozen=True)
class SyncTarget:
    session_key: int
    session_name: str | None
    session_type: str | None
    date_start: datetime


def _parse_openf1_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    normalized_value = value.replace("Z", "+00:00")
    parsed_value = datetime.fromisoformat(normalized_value)
    if parsed_value.tzinfo is None:
        return parsed_value.replace(tzinfo=UTC)
    return parsed_value.astimezone(UTC)


class SessionSyncPlanner:
    def __init__(self, settings: Settings) -> None:
        self._client = OpenF1Client(settings)

    def plan_recent_sessions(self, year: int, limit: int) -> list[SyncTarget]:
        current_time = datetime.now(UTC)
        raw_sessions = self._client.fetch_sessions(year=year)
        planned_targets: list[SyncTarget] = []
        seen_session_keys: set[int] = set()

        for raw_session in raw_sessions:
            session_key = raw_session.get("session_key")
            if not isinstance(session_key, int) or session_key in seen_session_keys:
                continue

            date_start = _parse_openf1_datetime(raw_session.get("date_start"))
            if date_start is None or date_start > current_time:
                continue

            seen_session_keys.add(session_key)
            planned_targets.append(
                SyncTarget(
                    session_key=session_key,
                    session_name=raw_session.get("session_name"),
                    session_type=raw_session.get("session_type"),
                    date_start=date_start,
                )
            )

        planned_targets.sort(key=lambda target: target.date_start, reverse=True)
        limited_targets = planned_targets[:limit]
        return sorted(limited_targets, key=lambda target: target.date_start)
