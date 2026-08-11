from datetime import date

from fastapi import APIRouter, Query

from app.api.dependencies import CatalogDependency
from app.models.enums import GovernmentBodyType
from app.schemas.common import PageResponse
from app.schemas.government import (
    GovernmentBodyOut,
    PublicOfficeOut,
    RepresentativeOut,
)

router = APIRouter(tags=["government"])


@router.get("/government-bodies", response_model=PageResponse[GovernmentBodyOut])
def list_government_bodies(
    catalog: CatalogDependency,
    body_type: GovernmentBodyType | None = None,
    parent: str | None = None,
    active_on: date | None = None,
    q: str | None = Query(default=None, min_length=1, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> PageResponse[GovernmentBodyOut]:
    result = catalog.list_government_bodies(
        body_type=body_type,
        parent=parent,
        active_on=active_on,
        query=q,
        page=page,
        page_size=page_size,
    )
    return PageResponse(data=result.data, meta=result.meta)


@router.get("/government-bodies/{identifier}", response_model=GovernmentBodyOut)
def get_government_body(identifier: str, catalog: CatalogDependency) -> GovernmentBodyOut:
    return catalog.get_government_body(identifier)


@router.get("/public-offices", response_model=PageResponse[PublicOfficeOut])
def list_public_offices(
    catalog: CatalogDependency,
    active_on: date | None = None,
    q: str | None = Query(default=None, min_length=1, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> PageResponse[PublicOfficeOut]:
    result = catalog.list_public_offices(
        active_on=active_on, query=q, page=page, page_size=page_size
    )
    return PageResponse(data=result.data, meta=result.meta)


@router.get("/representatives", response_model=PageResponse[RepresentativeOut])
def list_representatives(
    catalog: CatalogDependency,
    active_on: date | None = None,
    q: str | None = Query(default=None, min_length=1, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> PageResponse[RepresentativeOut]:
    result = catalog.list_representatives(
        active_on=active_on, query=q, page=page, page_size=page_size
    )
    return PageResponse(data=result.data, meta=result.meta)
