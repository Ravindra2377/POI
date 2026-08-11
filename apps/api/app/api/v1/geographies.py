from datetime import date

from fastapi import APIRouter, Query

from app.api.dependencies import CatalogDependency
from app.models.enums import GeographyType
from app.schemas.common import PageResponse
from app.schemas.geography import GeographyOut

router = APIRouter(prefix="/geographies", tags=["geographies"])


@router.get("", response_model=PageResponse[GeographyOut])
def list_geographies(
    catalog: CatalogDependency,
    entity_type: GeographyType | None = None,
    parent: str | None = None,
    active_on: date | None = None,
    q: str | None = Query(default=None, min_length=1, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> PageResponse[GeographyOut]:
    result = catalog.list_geographies(
        entity_type=entity_type,
        parent=parent,
        active_on=active_on,
        query=q,
        page=page,
        page_size=page_size,
    )
    return PageResponse(data=result.data, meta=result.meta)


@router.get("/{identifier}", response_model=GeographyOut)
def get_geography(identifier: str, catalog: CatalogDependency) -> GeographyOut:
    return catalog.get_geography(identifier)


@router.get("/{identifier}/children", response_model=PageResponse[GeographyOut])
def list_children(
    identifier: str,
    catalog: CatalogDependency,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> PageResponse[GeographyOut]:
    result = catalog.list_children(identifier=identifier, page=page, page_size=page_size)
    return PageResponse(data=result.data, meta=result.meta)
