from fastapi import APIRouter

from app.api.dependencies import CatalogDependency
from app.schemas.procurement import ProcurementCatalogOut

router = APIRouter(prefix="/procurement", tags=["procurement"])


@router.get("", response_model=ProcurementCatalogOut)
def list_procurement(catalog: CatalogDependency) -> ProcurementCatalogOut:
    return catalog.list_procurement()
