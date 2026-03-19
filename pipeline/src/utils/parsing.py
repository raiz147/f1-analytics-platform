from __future__ import annotations

from typing import Any


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    return float(value)


def _to_int(value: Any) -> int | None:
    if value is None:
        return None
    return int(value)


def _to_bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in {"true", "1", "yes"}
    return bool(value)


def normalize_lap_record(record: dict[str, Any], session_key: int) -> dict[str, Any]:
    driver_number = _to_int(record.get("driver_number"))
    lap_number = _to_int(record.get("lap_number"))
    if driver_number is None or lap_number is None:
        raise ValueError("Lap record is missing required driver_number or lap_number")

    return {
        "session_key": session_key,
        "meeting_key": _to_int(record.get("meeting_key")),
        "driver_number": driver_number,
        "lap_number": lap_number,
        "stint_number": _to_int(record.get("stint_number")),
        "lap_duration_seconds": _to_float(record.get("lap_duration")),
        "is_pit_out_lap": _to_bool(record.get("is_pit_out_lap")),
        "duration_sector_1_seconds": _to_float(record.get("duration_sector_1")),
        "duration_sector_2_seconds": _to_float(record.get("duration_sector_2")),
        "duration_sector_3_seconds": _to_float(record.get("duration_sector_3")),
        "i1_speed": _to_int(record.get("i1_speed")),
        "i2_speed": _to_int(record.get("i2_speed")),
        "st_speed": _to_int(record.get("st_speed")),
        "segments_sector_1": record.get("segments_sector_1"),
        "segments_sector_2": record.get("segments_sector_2"),
        "segments_sector_3": record.get("segments_sector_3"),
        "date_start": record.get("date_start"),
        "source_payload": record,
    }


def normalize_session_record(record: dict[str, Any]) -> dict[str, Any]:
    session_key = _to_int(record.get("session_key"))
    if session_key is None:
        raise ValueError("Session record is missing required session_key")

    return {
        "session_key": session_key,
        "meeting_key": _to_int(record.get("meeting_key")),
        "session_name": record.get("session_name"),
        "session_type": record.get("session_type"),
        "country_name": record.get("country_name"),
        "circuit_short_name": record.get("circuit_short_name"),
        "location": record.get("location"),
        "date_start": record.get("date_start"),
        "date_end": record.get("date_end"),
    }


def normalize_driver_record(record: dict[str, Any], session_key: int) -> dict[str, Any]:
    driver_number = _to_int(record.get("driver_number"))
    if driver_number is None:
        raise ValueError("Driver record is missing required driver_number")

    return {
        "session_key": session_key,
        "driver_number": driver_number,
        "meeting_key": _to_int(record.get("meeting_key")),
        "first_name": record.get("first_name"),
        "last_name": record.get("last_name"),
        "full_name": record.get("full_name"),
        "broadcast_name": record.get("broadcast_name"),
        "name_acronym": record.get("name_acronym"),
        "team_name": record.get("team_name"),
        "team_colour": record.get("team_colour"),
        "headshot_url": record.get("headshot_url"),
        "country_code": record.get("country_code"),
    }


def normalize_weather_record(record: dict[str, Any], session_key: int) -> dict[str, Any]:
    date = record.get("date")
    if date is None:
        raise ValueError("Weather record is missing required date")

    return {
        "session_key": session_key,
        "date": date,
        "meeting_key": _to_int(record.get("meeting_key")),
        "air_temperature": _to_float(record.get("air_temperature")),
        "humidity": _to_float(record.get("humidity")),
        "pressure": _to_float(record.get("pressure")),
        "rainfall": _to_bool(record.get("rainfall")),
        "track_temperature": _to_float(record.get("track_temperature")),
        "wind_direction": _to_int(record.get("wind_direction")),
        "wind_speed": _to_float(record.get("wind_speed")),
    }


def normalize_race_control_record(record: dict[str, Any], session_key: int) -> dict[str, Any]:
    date = record.get("date")
    category = record.get("category")
    message = record.get("message")
    if date is None or category is None or message is None:
        raise ValueError("Race control record is missing required date, category, or message")

    return {
        "session_key": session_key,
        "date": date,
        "category": category,
        "message": message,
        "driver_number": _to_int(record.get("driver_number")),
        "flag": record.get("flag"),
        "lap_number": _to_int(record.get("lap_number")),
        "meeting_key": _to_int(record.get("meeting_key")),
        "scope": record.get("scope"),
        "sector": _to_int(record.get("sector")),
        "qualifying_phase": _to_int(record.get("qualifying_phase")),
    }


def normalize_stint_record(record: dict[str, Any], session_key: int) -> dict[str, Any]:
    driver_number = _to_int(record.get("driver_number"))
    stint_number = _to_int(record.get("stint_number"))
    if driver_number is None or stint_number is None:
        raise ValueError("Stint record is missing required driver_number or stint_number")

    return {
        "session_key": session_key,
        "driver_number": driver_number,
        "stint_number": stint_number,
        "meeting_key": _to_int(record.get("meeting_key")),
        "lap_start": _to_int(record.get("lap_start")),
        "lap_end": _to_int(record.get("lap_end")),
        "compound": record.get("compound"),
        "tyre_age_at_start": _to_int(record.get("tyre_age_at_start")),
    }


def normalize_session_result_record(record: dict[str, Any], session_key: int) -> dict[str, Any]:
    driver_number = _to_int(record.get("driver_number"))
    position = _to_int(record.get("position"))
    if driver_number is None:
        raise ValueError("Session result record is missing required driver_number")

    return {
        "session_key": session_key,
        "driver_number": driver_number,
        "meeting_key": _to_int(record.get("meeting_key")),
        "position": position,
        "dnf": _to_bool(record.get("dnf")),
        "dns": _to_bool(record.get("dns")),
        "dsq": _to_bool(record.get("dsq")),
        "number_of_laps": _to_int(record.get("number_of_laps")),
        "duration": record.get("duration"),
        "gap_to_leader": record.get("gap_to_leader"),
        "source_payload": record,
    }


def normalize_starting_grid_record(record: dict[str, Any], session_key: int) -> dict[str, Any]:
    driver_number = _to_int(record.get("driver_number"))
    position = _to_int(record.get("position"))
    if driver_number is None or position is None:
        raise ValueError("Starting grid record is missing required driver_number or position")

    return {
        "session_key": session_key,
        "driver_number": driver_number,
        "meeting_key": _to_int(record.get("meeting_key")),
        "grid_position": position,
        "lap_duration_seconds": _to_float(record.get("lap_duration")),
        "source_payload": record,
    }
