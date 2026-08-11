from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories import CatalogRepository, SQLCatalogRepository


def get_catalog(session: Annotated[Session, Depends(get_db)]) -> CatalogRepository:
    return SQLCatalogRepository(session)


CatalogDependency = Annotated[CatalogRepository, Depends(get_catalog)]
