from __future__ import annotations
from collections.abc import Sequence
from typing import Any

from psycopg import Connection
from psycopg.types.json import Json


class LapRepository:
    def __init__(self, connection: Connection) -> None:
        self._connection = connection

    def upsert_session(self, session_record: dict[str, Any]) -> None:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO raw.sessions (
                    session_key,
                    meeting_key,
                    session_name,
                    session_type,
                    country_name,
                    circuit_short_name,
                    location,
                    date_end,
                    date_start,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (session_key) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    session_name = COALESCE(EXCLUDED.session_name, raw.sessions.session_name),
                    session_type = COALESCE(EXCLUDED.session_type, raw.sessions.session_type),
                    country_name = COALESCE(EXCLUDED.country_name, raw.sessions.country_name),
                    circuit_short_name = COALESCE(EXCLUDED.circuit_short_name, raw.sessions.circuit_short_name),
                    location = COALESCE(EXCLUDED.location, raw.sessions.location),
                    date_end = COALESCE(EXCLUDED.date_end, raw.sessions.date_end),
                    date_start = COALESCE(EXCLUDED.date_start, raw.sessions.date_start),
                    updated_at = NOW()
                """,
                (
                    session_record["session_key"],
                    session_record.get("meeting_key"),
                    session_record.get("session_name"),
                    session_record.get("session_type"),
                    session_record.get("country_name"),
                    session_record.get("circuit_short_name"),
                    session_record.get("location"),
                    session_record.get("date_end"),
                    session_record.get("date_start"),
                ),
            )

    def upsert_drivers(self, driver_records: Sequence[dict[str, Any]]) -> int:
        if not driver_records:
            return 0

        values = [
            (
                record["session_key"],
                record["driver_number"],
                record.get("meeting_key"),
                record.get("first_name"),
                record.get("last_name"),
                record.get("full_name"),
                record.get("broadcast_name"),
                record.get("name_acronym"),
                record.get("team_name"),
                record.get("team_colour"),
                record.get("headshot_url"),
                record.get("country_code"),
            )
            for record in driver_records
        ]

        with self._connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO raw.drivers (
                    session_key,
                    driver_number,
                    meeting_key,
                    first_name,
                    last_name,
                    full_name,
                    broadcast_name,
                    name_acronym,
                    team_name,
                    team_colour,
                    headshot_url,
                    country_code
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (session_key, driver_number) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    full_name = EXCLUDED.full_name,
                    broadcast_name = EXCLUDED.broadcast_name,
                    name_acronym = EXCLUDED.name_acronym,
                    team_name = EXCLUDED.team_name,
                    team_colour = EXCLUDED.team_colour,
                    headshot_url = EXCLUDED.headshot_url,
                    country_code = EXCLUDED.country_code,
                    updated_at = NOW()
                """,
                values,
            )

        return len(values)

    def upsert_weather(self, weather_records: Sequence[dict[str, Any]]) -> int:
        if not weather_records:
            return 0

        values = [
            (
                record["session_key"],
                record["date"],
                record.get("meeting_key"),
                record.get("air_temperature"),
                record.get("humidity"),
                record.get("pressure"),
                record.get("rainfall"),
                record.get("track_temperature"),
                record.get("wind_direction"),
                record.get("wind_speed"),
            )
            for record in weather_records
        ]

        with self._connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO raw.weather (
                    session_key,
                    date,
                    meeting_key,
                    air_temperature,
                    humidity,
                    pressure,
                    rainfall,
                    track_temperature,
                    wind_direction,
                    wind_speed
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (session_key, date) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    air_temperature = EXCLUDED.air_temperature,
                    humidity = EXCLUDED.humidity,
                    pressure = EXCLUDED.pressure,
                    rainfall = EXCLUDED.rainfall,
                    track_temperature = EXCLUDED.track_temperature,
                    wind_direction = EXCLUDED.wind_direction,
                    wind_speed = EXCLUDED.wind_speed,
                    updated_at = NOW()
                """,
                values,
            )

        return len(values)

    def upsert_race_control(self, race_control_records: Sequence[dict[str, Any]]) -> int:
        if not race_control_records:
            return 0

        values = [
            (
                record["session_key"],
                record["date"],
                record["category"],
                record["message"],
                record.get("driver_number"),
                record.get("flag"),
                record.get("lap_number"),
                record.get("meeting_key"),
                record.get("scope"),
                record.get("sector"),
                record.get("qualifying_phase"),
            )
            for record in race_control_records
        ]

        with self._connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO raw.race_control (
                    session_key,
                    date,
                    category,
                    message,
                    driver_number,
                    flag,
                    lap_number,
                    meeting_key,
                    scope,
                    sector,
                    qualifying_phase
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (session_key, date, category, message) DO UPDATE
                SET driver_number = EXCLUDED.driver_number,
                    flag = EXCLUDED.flag,
                    lap_number = EXCLUDED.lap_number,
                    meeting_key = EXCLUDED.meeting_key,
                    scope = EXCLUDED.scope,
                    sector = EXCLUDED.sector,
                    qualifying_phase = EXCLUDED.qualifying_phase,
                    updated_at = NOW()
                """,
                values,
            )

        return len(values)

    def upsert_stints(self, stint_records: Sequence[dict[str, Any]]) -> int:
        if not stint_records:
            return 0

        values = [
            (
                record["session_key"],
                record["driver_number"],
                record["stint_number"],
                record.get("meeting_key"),
                record.get("lap_start"),
                record.get("lap_end"),
                record.get("compound"),
                record.get("tyre_age_at_start"),
            )
            for record in stint_records
        ]

        with self._connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO raw.stints (
                    session_key,
                    driver_number,
                    stint_number,
                    meeting_key,
                    lap_start,
                    lap_end,
                    compound,
                    tyre_age_at_start
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (session_key, driver_number, stint_number) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    lap_start = EXCLUDED.lap_start,
                    lap_end = EXCLUDED.lap_end,
                    compound = EXCLUDED.compound,
                    tyre_age_at_start = EXCLUDED.tyre_age_at_start,
                    updated_at = NOW()
                """,
                values,
            )

        return len(values)

    def upsert_session_results(self, result_records: Sequence[dict[str, Any]]) -> int:
        if not result_records:
            return 0

        values = [
            (
                record["session_key"],
                record["driver_number"],
                record.get("meeting_key"),
                record["position"],
                record.get("dnf"),
                record.get("dns"),
                record.get("dsq"),
                record.get("number_of_laps"),
                Json(record.get("duration")),
                Json(record.get("gap_to_leader")),
                Json(record["source_payload"]),
            )
            for record in result_records
        ]

        with self._connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO raw.session_results (
                    session_key,
                    driver_number,
                    meeting_key,
                    position,
                    dnf,
                    dns,
                    dsq,
                    number_of_laps,
                    duration_value,
                    gap_to_leader_value,
                    source_payload
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (session_key, driver_number) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    position = EXCLUDED.position,
                    dnf = EXCLUDED.dnf,
                    dns = EXCLUDED.dns,
                    dsq = EXCLUDED.dsq,
                    number_of_laps = EXCLUDED.number_of_laps,
                    duration_value = EXCLUDED.duration_value,
                    gap_to_leader_value = EXCLUDED.gap_to_leader_value,
                    source_payload = EXCLUDED.source_payload,
                    updated_at = NOW()
                """,
                values,
            )

        return len(values)

    def upsert_starting_grid(self, grid_records: Sequence[dict[str, Any]]) -> int:
        if not grid_records:
            return 0

        values = [
            (
                record["session_key"],
                record["driver_number"],
                record.get("meeting_key"),
                record["grid_position"],
                record.get("lap_duration_seconds"),
                Json(record["source_payload"]),
            )
            for record in grid_records
        ]

        with self._connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO raw.starting_grid (
                    session_key,
                    driver_number,
                    meeting_key,
                    grid_position,
                    lap_duration_seconds,
                    source_payload
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (session_key, driver_number) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    grid_position = EXCLUDED.grid_position,
                    lap_duration_seconds = EXCLUDED.lap_duration_seconds,
                    source_payload = EXCLUDED.source_payload,
                    updated_at = NOW()
                """,
                values,
            )

        return len(values)

    def upsert_laps(self, lap_records: Sequence[dict[str, Any]]) -> int:
        if not lap_records:
            return 0

        values = [
            (
                record["session_key"],
                record.get("meeting_key"),
                record["driver_number"],
                record["lap_number"],
                record.get("stint_number"),
                record.get("lap_duration_seconds"),
                record.get("is_pit_out_lap"),
                record.get("duration_sector_1_seconds"),
                record.get("duration_sector_2_seconds"),
                record.get("duration_sector_3_seconds"),
                record.get("i1_speed"),
                record.get("i2_speed"),
                record.get("st_speed"),
                Json(record.get("segments_sector_1")),
                Json(record.get("segments_sector_2")),
                Json(record.get("segments_sector_3")),
                record.get("date_start"),
                Json(record["source_payload"]),
            )
            for record in lap_records
        ]

        with self._connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO raw.laps (
                    session_key,
                    meeting_key,
                    driver_number,
                    lap_number,
                    stint_number,
                    lap_duration_seconds,
                    is_pit_out_lap,
                    duration_sector_1_seconds,
                    duration_sector_2_seconds,
                    duration_sector_3_seconds,
                    i1_speed,
                    i2_speed,
                    st_speed,
                    segments_sector_1,
                    segments_sector_2,
                    segments_sector_3,
                    date_start,
                    source_payload
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s
                )
                ON CONFLICT (session_key, driver_number, lap_number) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    stint_number = EXCLUDED.stint_number,
                    lap_duration_seconds = EXCLUDED.lap_duration_seconds,
                    is_pit_out_lap = EXCLUDED.is_pit_out_lap,
                    duration_sector_1_seconds = EXCLUDED.duration_sector_1_seconds,
                    duration_sector_2_seconds = EXCLUDED.duration_sector_2_seconds,
                    duration_sector_3_seconds = EXCLUDED.duration_sector_3_seconds,
                    i1_speed = EXCLUDED.i1_speed,
                    i2_speed = EXCLUDED.i2_speed,
                    st_speed = EXCLUDED.st_speed,
                    segments_sector_1 = EXCLUDED.segments_sector_1,
                    segments_sector_2 = EXCLUDED.segments_sector_2,
                    segments_sector_3 = EXCLUDED.segments_sector_3,
                    date_start = EXCLUDED.date_start,
                    source_payload = EXCLUDED.source_payload,
                    updated_at = NOW()
                """,
                values,
            )

        return len(values)
