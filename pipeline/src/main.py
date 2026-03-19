from __future__ import annotations

import argparse
import logging
import sys
from datetime import UTC, datetime

from src.config import get_settings
from src.database import get_db_connection
from src.logging_config import configure_logging
from src.services.ingestion import LapIngestionService
from src.services.processing import SessionProcessingService
from src.services.scheduler import SessionSyncPlanner


logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="F1 data pipeline CLI.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest_parser = subparsers.add_parser("ingest", help="Fetch raw lap data from OpenF1")
    ingest_parser.add_argument("--session-key", type=int, required=True, help="OpenF1 session key")
    ingest_parser.add_argument("--meeting-key", type=int, help="Optional OpenF1 meeting key filter")
    ingest_parser.add_argument("--driver-number", type=int, help="Optional driver filter")

    process_parser = subparsers.add_parser("process", help="Build analytics tables from raw data")
    process_parser.add_argument("--session-key", type=int, required=True, help="Session key to process")

    sync_parser = subparsers.add_parser(
        "sync", help="Run ingestion and processing for a single session"
    )
    sync_parser.add_argument("--session-key", type=int, required=True, help="OpenF1 session key")
    sync_parser.add_argument("--meeting-key", type=int, help="Optional OpenF1 meeting key filter")
    sync_parser.add_argument("--driver-number", type=int, help="Optional driver filter")

    sync_recent_parser = subparsers.add_parser(
        "sync-recent", help="Discover and sync the most recent completed sessions"
    )
    sync_recent_parser.add_argument(
        "--year",
        type=int,
        default=datetime.now(UTC).year,
        help="Season year to inspect. Defaults to the current year.",
    )
    sync_recent_parser.add_argument(
        "--limit",
        type=int,
        default=6,
        help="Maximum number of recent completed sessions to sync.",
    )

    return parser.parse_args()


def sync_session(
    *,
    settings,
    connection,
    session_key: int,
    meeting_key: int | None = None,
    driver_number: int | None = None,
) -> dict[str, int]:
    ingestion_service = LapIngestionService(settings=settings, connection=connection)
    inserted_count = ingestion_service.ingest_laps(
        session_key=session_key,
        meeting_key=meeting_key,
        driver_number=driver_number,
    )
    logger.info(
        "Ingestion completed",
        extra={"session_key": session_key, "rows_upserted": inserted_count},
    )

    processing_service = SessionProcessingService(connection=connection)
    result = processing_service.process_session(session_key=session_key)
    logger.info("Sync completed", extra={"session_key": session_key, "rows_upserted": inserted_count, **result})
    return {"rows_upserted": inserted_count, **result}


def main() -> int:
    configure_logging()
    args = parse_args()
    settings = get_settings()

    try:
        with get_db_connection(settings) as connection:
            if args.command == "ingest":
                service = LapIngestionService(settings=settings, connection=connection)
                inserted_count = service.ingest_laps(
                    session_key=args.session_key,
                    meeting_key=args.meeting_key,
                    driver_number=args.driver_number,
                )
                logger.info("Ingestion completed", extra={"rows_upserted": inserted_count})
            elif args.command == "process":
                service = SessionProcessingService(connection=connection)
                result = service.process_session(session_key=args.session_key)
                logger.info("Processing completed", extra=result)
            elif args.command == "sync":
                sync_session(
                    settings=settings,
                    connection=connection,
                    session_key=args.session_key,
                    meeting_key=args.meeting_key,
                    driver_number=args.driver_number,
                )
            elif args.command == "sync-recent":
                planner = SessionSyncPlanner(settings=settings)
                targets = planner.plan_recent_sessions(year=args.year, limit=args.limit)
                logger.info(
                    "Recent session sync plan created",
                    extra={"year": args.year, "limit": args.limit, "session_count": len(targets)},
                )
                for target in targets:
                    sync_session(
                        settings=settings,
                        connection=connection,
                        session_key=target.session_key,
                    )
            else:
                raise ValueError(f"Unsupported command: {args.command}")
        return 0
    except Exception:
        logger.exception("Pipeline command failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
