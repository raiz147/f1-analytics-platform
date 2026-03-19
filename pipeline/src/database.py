from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from psycopg import Connection, connect

from src.config import Settings


@contextmanager
def get_db_connection(settings: Settings) -> Iterator[Connection]:
    connection = connect(settings.postgres_dsn)
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
