from __future__ import annotations

import logging
from typing import Any

import requests

from src.config import Settings


logger = logging.getLogger(__name__)


class OpenF1Client:
    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.openf1_base_url.rstrip("/")
        self._timeout = settings.openf1_timeout_seconds

    def fetch_laps(
        self,
        session_key: int,
        meeting_key: int | None = None,
        driver_number: int | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"session_key": session_key}
        if meeting_key is not None:
            params["meeting_key"] = meeting_key
        if driver_number is not None:
            params["driver_number"] = driver_number

        url = f"{self._base_url}/laps"
        logger.info("Fetching laps from OpenF1", extra={"url": url, "params": params})
        response = requests.get(url, params=params, timeout=self._timeout)
        response.raise_for_status()

        payload = response.json()
        if not isinstance(payload, list):
            raise ValueError("Unexpected OpenF1 response: expected a list of lap records")

        return payload

    def fetch_session(self, session_key: int) -> dict[str, Any] | None:
        payload = self._get("sessions", {"session_key": session_key})
        if not payload:
            return None
        return payload[0]

    def fetch_sessions(self, year: int) -> list[dict[str, Any]]:
        return self._get("sessions", {"year": year})

    def fetch_drivers(self, session_key: int) -> list[dict[str, Any]]:
        return self._get("drivers", {"session_key": session_key})

    def fetch_weather(self, session_key: int) -> list[dict[str, Any]]:
        return self._get("weather", {"session_key": session_key})

    def fetch_race_control(self, session_key: int) -> list[dict[str, Any]]:
        return self._get("race_control", {"session_key": session_key})

    def fetch_stints(self, session_key: int) -> list[dict[str, Any]]:
        return self._get("stints", {"session_key": session_key})

    def fetch_session_result(self, session_key: int) -> list[dict[str, Any]]:
        return self._get("session_result", {"session_key": session_key})

    def fetch_starting_grid(
        self, session_key: int, meeting_key: int | None = None
    ) -> list[dict[str, Any]]:
        try:
            return self._get("starting_grid", {"session_key": session_key})
        except requests.HTTPError as error:
            response = error.response
            if response is not None and response.status_code == 404 and meeting_key is not None:
                logger.info(
                    "Starting grid not available by session, retrying by meeting",
                    extra={"session_key": session_key, "meeting_key": meeting_key},
                )
                return self._get("starting_grid", {"meeting_key": meeting_key})
            if response is not None and response.status_code == 404:
                logger.info(
                    "Starting grid not available for session",
                    extra={"session_key": session_key},
                )
                return []
            raise

    def _get(self, endpoint: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        url = f"{self._base_url}/{endpoint}"
        logger.info("Fetching OpenF1 resource", extra={"url": url, "params": params})
        response = requests.get(url, params=params, timeout=self._timeout)
        response.raise_for_status()

        payload = response.json()
        if not isinstance(payload, list):
            raise ValueError(f"Unexpected OpenF1 response for {endpoint}: expected a list")

        return payload
