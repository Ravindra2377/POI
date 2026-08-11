from fastapi import APIRouter

from app.api.v1.geographies import router as geographies_router
from app.api.v1.government import router as government_router

router = APIRouter(prefix="/api/v1")
router.include_router(geographies_router)
router.include_router(government_router)
