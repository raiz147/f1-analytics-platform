from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    openf1_base_url: str = os.getenv("OPENF1_BASE_URL", "https://api.openf1.org/v1")
    openf1_timeout_seconds: int = int(os.getenv("OPENF1_TIMEOUT_SECONDS", "30"))
    database_url: str | None = os.getenv("DATABASE_URL")
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_db: str = os.getenv("POSTGRES_DB", "f1_analytics")
    postgres_user: str = os.getenv("POSTGRES_USER", "f1")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "f1_password")

    @property
    def postgres_dsn(self) -> str:
        if self.database_url:
            return self.database_url

        return (
            f"host={self.postgres_host} "
            f"port={self.postgres_port} "
            f"dbname={self.postgres_db} "
            f"user={self.postgres_user} "
            f"password={self.postgres_password}"
        )


def get_settings() -> Settings:
    return Settings()
