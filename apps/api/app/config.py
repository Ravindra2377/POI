import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_env: str
    cors_origins: tuple[str, ...]
    database_url: str | None
    community_submissions_enabled: bool
    professional_registration_enabled: bool
    public_web_url: str
    smtp_host: str | None
    smtp_port: int
    smtp_username: str | None
    smtp_password: str | None
    smtp_from_email: str | None
    smtp_use_tls: bool

    @property
    def professional_email_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from_email)


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
    registration_setting = os.getenv("PROFESSIONAL_REGISTRATION_ENABLED")
    if registration_setting is None:
        professional_registration_enabled = app_env.casefold() != "production"
    else:
        professional_registration_enabled = registration_setting.strip().casefold() in {
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
        professional_registration_enabled=professional_registration_enabled,
        public_web_url=os.getenv("PUBLIC_WEB_URL", "http://localhost:3000").rstrip("/"),
        smtp_host=os.getenv("SMTP_HOST"),
        smtp_port=int(os.getenv("SMTP_PORT", "587")),
        smtp_username=os.getenv("SMTP_USERNAME"),
        smtp_password=os.getenv("SMTP_PASSWORD"),
        smtp_from_email=os.getenv("SMTP_FROM_EMAIL"),
        smtp_use_tls=os.getenv("SMTP_USE_TLS", "true").strip().casefold()
        in {"1", "true", "yes", "on"},
    )
