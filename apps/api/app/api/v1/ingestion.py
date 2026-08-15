from fastapi import APIRouter

from app.api.dependencies import CatalogDependency
from app.schemas.ingestion import FeedStatusOut

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


@router.get("/feeds", response_model=list[FeedStatusOut])
def list_feed_statuses(catalog: CatalogDependency) -> list[FeedStatusOut]:
    return catalog.list_feed_statuses()
