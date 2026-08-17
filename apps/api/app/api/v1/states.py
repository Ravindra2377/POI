"""FastAPI router serving the All-India 36 States & Union Territories registry."""

from typing import Any

from fastapi import APIRouter

from app.ingestion.all_states import get_all_states
from app.ingestion.languages import LANGUAGE_REGISTRY

router = APIRouter(prefix="/states", tags=["catalog"])


@router.get("", response_model=None)
def list_all_states() -> dict[str, Any]:
    """Return official reviewed records for all 28 States and 8 Union Territories of India."""
    items = get_all_states()
    language_codes = sorted({lang for item in items for lang in item["official_languages"]})
    return {
        "status": "reviewed",
        "total": len(items),
        "states_count": len([i for i in items if i["category"] == "state"]),
        "union_territories_count": len(
            [i for i in items if i["category"] == "union_territory"]
        ),
        "languages_available": len(language_codes),
        "languages": [
            {
                "code": record.code,
                "english_name": record.english_name,
                "native_name": record.native_name,
            }
            for record in LANGUAGE_REGISTRY
            if record.code in language_codes
        ],
        "data": items,
    }
