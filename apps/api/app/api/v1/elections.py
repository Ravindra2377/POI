from fastapi import APIRouter

from app.api.dependencies import CatalogDependency
from app.schemas.elections import ElectionResultCatalogOut

router = APIRouter(prefix="/election-results", tags=["election-results"])


@router.get("", response_model=ElectionResultCatalogOut)
def list_election_results(catalog: CatalogDependency) -> ElectionResultCatalogOut:
    return catalog.list_election_results()
