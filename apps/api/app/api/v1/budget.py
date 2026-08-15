from fastapi import APIRouter

from app.api.dependencies import CatalogDependency
from app.schemas.budget import BudgetCatalogOut

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("", response_model=BudgetCatalogOut)
def list_budget(catalog: CatalogDependency) -> BudgetCatalogOut:
    return catalog.list_budget()