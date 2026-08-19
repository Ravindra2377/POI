from fastapi import APIRouter, Query

from app.api.dependencies import CatalogDependency
from app.schemas.schemes import SchemeCatalogOut

router = APIRouter(prefix="/schemes", tags=["schemes"])


@router.get("", response_model=SchemeCatalogOut)
def list_schemes(
    catalog: CatalogDependency,
    state: str | None = Query(
        default=None,
        description="ISO-3166-2 jurisdiction code, e.g. IN-TN; empty returns all States/UTs",
    ),
) -> SchemeCatalogOut:
    return catalog.list_schemes(jurisdiction_code=state)