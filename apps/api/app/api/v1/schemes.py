from fastapi import APIRouter

from app.api.dependencies import CatalogDependency
from app.schemas.schemes import SchemeCatalogOut

router = APIRouter(prefix="/schemes", tags=["schemes"])


@router.get("", response_model=SchemeCatalogOut)
def list_schemes(catalog: CatalogDependency) -> SchemeCatalogOut:
    return catalog.list_schemes()