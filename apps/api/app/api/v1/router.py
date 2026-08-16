from fastapi import APIRouter

from app.api.v1.budget import router as budget_router
from app.api.v1.elections import router as elections_router
from app.api.v1.geographies import router as geographies_router
from app.api.v1.government import router as government_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.officeholders import router as officeholders_router
from app.api.v1.procurement import router as procurement_router
from app.api.v1.projects import router as projects_router
from app.api.v1.schemes import router as schemes_router

router = APIRouter(prefix="/api/v1")
router.include_router(geographies_router)
router.include_router(government_router)
router.include_router(ingestion_router)
router.include_router(schemes_router)
router.include_router(budget_router)
router.include_router(officeholders_router)
router.include_router(elections_router)
router.include_router(projects_router)
router.include_router(procurement_router)
