from __future__ import annotations

import logging

from psycopg import Connection

from src.clients.openf1 import OpenF1Client
from src.config import Settings
from src.repositories.laps import LapRepository
from src.utils.parsing import (
    normalize_driver_record,
    normalize_lap_record,
    normalize_race_control_record,
    normalize_session_record,
    normalize_session_result_record,
    normalize_starting_grid_record,
    normalize_stint_record,
    normalize_weather_record,
)


logger = logging.getLogger(__name__)


class LapIngestionService:
    def __init__(self, settings: Settings, connection: Connection) -> None:
        self._client = OpenF1Client(settings)
        self._repository = LapRepository(connection)

    def ingest_laps(
        self,
        session_key: int,
        meeting_key: int | None = None,
        driver_number: int | None = None,
    ) -> int:
        raw_session = self._client.fetch_session(session_key=session_key)
        if raw_session is not None:
            self._repository.upsert_session(normalize_session_record(raw_session))

        raw_drivers = self._client.fetch_drivers(session_key=session_key)
        normalized_drivers = [
            normalize_driver_record(record, session_key=session_key) for record in raw_drivers
        ]
        driver_count = self._repository.upsert_drivers(normalized_drivers)
        logger.info("Driver metadata persisted", extra={"record_count": driver_count})

        raw_weather = self._client.fetch_weather(session_key=session_key)
        normalized_weather = [
            normalize_weather_record(record, session_key=session_key) for record in raw_weather
        ]
        weather_count = self._repository.upsert_weather(normalized_weather)
        logger.info("Weather records persisted", extra={"record_count": weather_count})

        raw_race_control = self._client.fetch_race_control(session_key=session_key)
        normalized_race_control = [
            normalize_race_control_record(record, session_key=session_key)
            for record in raw_race_control
        ]
        race_control_count = self._repository.upsert_race_control(normalized_race_control)
        logger.info("Race control records persisted", extra={"record_count": race_control_count})

        raw_stints = self._client.fetch_stints(session_key=session_key)
        normalized_stints = [
            normalize_stint_record(record, session_key=session_key) for record in raw_stints
        ]
        stint_count = self._repository.upsert_stints(normalized_stints)
        logger.info("Stint records persisted", extra={"record_count": stint_count})

        raw_session_results = self._client.fetch_session_result(session_key=session_key)
        normalized_session_results = []
        for record in raw_session_results:
            try:
                normalized_session_results.append(
                    normalize_session_result_record(record, session_key=session_key)
                )
            except ValueError:
                logger.warning(
                    "Skipping invalid session result record",
                    extra={"session_key": session_key, "record": record},
                )
        session_result_count = self._repository.upsert_session_results(normalized_session_results)
        logger.info(
            "Session result records persisted", extra={"record_count": session_result_count}
        )

        raw_starting_grid = self._client.fetch_starting_grid(
            session_key=session_key,
            meeting_key=raw_session.get("meeting_key") if raw_session is not None else meeting_key,
        )
        normalized_starting_grid = [
            normalize_starting_grid_record(record, session_key=session_key)
            for record in raw_starting_grid
        ]
        starting_grid_count = self._repository.upsert_starting_grid(normalized_starting_grid)
        logger.info("Starting grid records persisted", extra={"record_count": starting_grid_count})

        raw_laps = self._client.fetch_laps(
            session_key=session_key,
            meeting_key=meeting_key,
            driver_number=driver_number,
        )
        logger.info("Fetched lap records", extra={"record_count": len(raw_laps)})

        normalized_laps = [
            normalize_lap_record(record, session_key=session_key) for record in raw_laps
        ]

        if not normalized_laps:
            logger.warning("No lap records returned for provided filters")
            return 0

        if raw_session is None:
            self._repository.upsert_session(
                {
                    "session_key": session_key,
                    "meeting_key": normalized_laps[0].get("meeting_key"),
                    "session_name": None,
                    "session_type": None,
                    "country_name": None,
                    "circuit_short_name": None,
                    "location": None,
                    "date_end": None,
                    "date_start": normalized_laps[0].get("date_start"),
                }
            )
        upserted_count = self._repository.upsert_laps(normalized_laps)
        logger.info("Lap records persisted", extra={"record_count": upserted_count})
        return upserted_count
