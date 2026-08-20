import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_env: str
    cors_origins: tuple[str, ...]
    database_url: str | None
    community_submissions_enabled: bool


def load_settings() -> Settings:
    app_env = os.getenv("APP_ENV", "development")
    origins = tuple(
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    )
    submissions_setting = os.getenv("COMMUNITY_SUBMISSIONS_ENABLED")
    if submissions_setting is None:
        community_submissions_enabled = app_env.casefold() != "production"
    else:
        community_submissions_enabled = submissions_setting.strip().casefold() in {
            "1",
            "true",
            "yes",
            "on",
        }
    return Settings(
        app_env=app_env,
        cors_origins=origins,
        database_url=os.getenv("DATABASE_URL"),
        community_submissions_enabled=community_submissions_enabled,
    )
