from fastapi import APIRouter

from app.api.dependencies import CatalogDependency
from app.schemas.officeholders import OfficeholderCatalogOut

router = APIRouter(prefix="/officeholders", tags=["officeholders"])


@router.get("", response_model=OfficeholderCatalogOut)
def list_officeholders(catalog: CatalogDependency) -> OfficeholderCatalogOut:
    return catalog.list_officeholders()
