from __future__ import annotations

import logging

from psycopg import Connection

from src.repositories.analytics import AnalyticsRepository


logger = logging.getLogger(__name__)


class SessionProcessingService:
    def __init__(self, connection: Connection) -> None:
        self._repository = AnalyticsRepository(connection)

    def process_session(self, session_key: int) -> dict[str, int]:
        overview_rows = self._repository.refresh_session_overview(session_key)
        summary_rows = self._repository.refresh_driver_session_summary(session_key)
        fastest_rows = self._repository.refresh_session_fastest_laps(session_key)
        stint_rows = self._repository.refresh_driver_stint_summary(session_key)
        classification_rows = self._repository.refresh_session_classification(session_key)

        logger.info(
            "Session analytics refreshed",
            extra={
                "session_key": session_key,
                "session_overview_rows": overview_rows,
                "driver_summary_rows": summary_rows,
                "fastest_lap_rows": fastest_rows,
                "driver_stint_rows": stint_rows,
                "session_classification_rows": classification_rows,
            },
        )

        return {
            "session_overview_rows": overview_rows,
            "driver_session_summary_rows": summary_rows,
            "session_fastest_laps_rows": fastest_rows,
            "driver_stint_summary_rows": stint_rows,
            "session_classification_rows": classification_rows,
        }
