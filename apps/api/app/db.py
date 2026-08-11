from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import load_settings


class DatabaseConfigurationError(RuntimeError):
    pass


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


@lru_cache
def get_engine() -> Engine:
    database_url = load_settings().database_url
    if not database_url:
        raise DatabaseConfigurationError("DATABASE_URL is not configured")
    return create_engine(
        normalize_database_url(database_url),
        pool_pre_ping=True,
        pool_recycle=300,
    )


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    with get_session_factory()() as session:
        yield session


def check_database_readiness() -> str:
    with get_engine().connect() as connection:
        connection.execute(text("SELECT 1"))
        version = connection.execute(
            text("SELECT extversion FROM pg_extension WHERE extname = 'postgis'")
        ).scalar_one_or_none()
        if version is None:
            raise DatabaseConfigurationError("required PostGIS extension is not enabled")
        return str(version)
