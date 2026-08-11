from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import router as v1_router
from app.config import load_settings
from app.db import check_database_readiness
from app.repositories import CatalogNotFound
from app.schemas.common import ErrorDetail, ErrorResponse
from app.schemas.health import LiveHealth, ReadyHealth

ReadinessChecker = Callable[[], str]


def get_readiness_checker() -> ReadinessChecker:
    return check_database_readiness


def create_app() -> FastAPI:
    settings = load_settings()
    application = FastAPI(
        title="AP Civic Platform API",
        description="Public API foundation for Andhra Pradesh civic intelligence.",
        version="0.2.0",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["Accept", "Content-Type"],
    )
    application.include_router(v1_router)

    @application.exception_handler(CatalogNotFound)
    async def handle_not_found(_request: Request, exc: CatalogNotFound) -> JSONResponse:
        body = ErrorResponse(error=ErrorDetail(code="not_found", message=str(exc)))
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND, content=body.model_dump(mode="json")
        )

    @application.exception_handler(RequestValidationError)
    async def handle_validation(_request: Request, exc: RequestValidationError) -> JSONResponse:
        details = {
            ".".join(str(part) for part in error["loc"]): str(error["msg"])
            for error in exc.errors()
        }
        body = ErrorResponse(
            error=ErrorDetail(
                code="validation_error",
                message="Request parameters are invalid",
                details=details,
            )
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=body.model_dump(mode="json"),
        )

    return application


app = create_app()


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"name": "AP Civic Platform API", "documentation": "/docs"}


@app.get("/health", response_model=LiveHealth, tags=["operations"])
@app.get("/health/live", response_model=LiveHealth, tags=["operations"])
def liveness() -> LiveHealth:
    return LiveHealth(service="ap-civic-api", status="ok", version=app.version)


@app.get(
    "/health/ready",
    response_model=ReadyHealth,
    responses={503: {"model": ReadyHealth}},
    tags=["operations"],
)
def readiness(
    response: Response,
    checker: Annotated[ReadinessChecker, Depends(get_readiness_checker)],
) -> ReadyHealth:
    try:
        postgis_version = checker()
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadyHealth(
            service="ap-civic-api",
            status="not_ready",
            database="unavailable",
        )
    return ReadyHealth(
        service="ap-civic-api",
        status="ready",
        database="ok",
        postgis_version=postgis_version,
    )
