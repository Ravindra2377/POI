from app.schemas.common import APIModel


class LiveHealth(APIModel):
    service: str
    status: str
    version: str


class ReadyHealth(APIModel):
    service: str
    status: str
    database: str
    postgis_version: str | None = None
