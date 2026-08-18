from fastapi import APIRouter

from app.api.dependencies import CatalogDependency
from app.schemas.comparisons import ComparisonCatalogOut

router = APIRouter(prefix="/comparisons", tags=["comparisons"])


@router.get("", response_model=ComparisonCatalogOut)
def list_comparisons(catalog: CatalogDependency) -> ComparisonCatalogOut:
    return catalog.list_comparisons()