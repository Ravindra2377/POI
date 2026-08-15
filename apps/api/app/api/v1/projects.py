from fastapi import APIRouter

from app.api.dependencies import CatalogDependency
from app.schemas.projects import ProjectCatalogOut

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectCatalogOut)
def list_projects(catalog: CatalogDependency) -> ProjectCatalogOut:
    return catalog.list_projects()
