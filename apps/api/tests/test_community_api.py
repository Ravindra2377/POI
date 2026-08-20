import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1.community import create_community_report
from app.main import app
from app.schemas.community import CommunityReportCreate

client = TestClient(app)


def test_user_account_lifecycle() -> None:
    response = client.post(
        "/api/v1/community/users",
        json={
            "username": "citizen_ravi",
            "display_name": "Ravi Kumar",
            "consent_data_sharing": True,
            "consent_public_activity": True,
            "preferred_language": "te",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "citizen_ravi"
    assert data["preferred_language"] == "te"

    account_response = client.get("/api/v1/community/users/citizen_ravi")
    assert account_response.status_code == 200
    assert account_response.json()["display_name"] == "Ravi Kumar"


def test_community_polls_are_labelled_non_representative() -> None:
    response = client.get("/api/v1/community/polls")
    assert response.status_code == 200
    for poll in response.json():
        assert "Non-representative Community Pulse" in poll["non_representative_disclaimer"]


def test_community_report_enters_moderation_queue() -> None:
    response = client.post(
        "/api/v1/community/reports",
        json={
            "username": "citizen_ravi",
            "entity_type": "scheme",
            "entity_id": "ysr-rythu-bharosa",
            "title_en": "Delayed mandal payment disbursement",
            "description_en": "Observed 3 weeks delay in mandal office processing",
            "evidence_urls": [],
        },
    )
    assert response.status_code == 201
    report = response.json()
    assert report["classification"] == "community_reported"
    assert report["status"] == "pending_review"
    public_reports = client.get("/api/v1/community/reports").json()
    assert report["id"] not in {item["id"] for item in public_reports}


def test_moderation_requires_staff_database_and_session() -> None:
    response = client.post(
        "/api/v1/community/moderation",
        json={
            "action": "flag",
            "target_type": "report",
            "target_id": "11111111-1111-1111-1111-111111111111",
            "reason": "Requires field verification",
        },
    )
    assert response.status_code == 503


def test_all_status_content_inventory_is_not_public() -> None:
    response = client.get("/api/v1/community/admin/content")
    assert response.status_code == 503


def test_pending_comment_is_not_returned_by_public_fallback() -> None:
    response = client.post(
        "/api/v1/community/comments",
        json={
            "username": "citizen_ravi",
            "target_type": "scheme",
            "target_id": "ysr-rythu-bharosa",
            "rating": 2,
            "content_en": "Test review awaiting moderation",
        },
    )
    assert response.status_code == 201
    comment = response.json()
    assert comment["status"] == "pending_review"
    public_comments = client.get("/api/v1/community/comments").json()
    assert comment["id"] not in {item["id"] for item in public_comments}


def test_production_report_submission_never_falls_back_to_memory(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    payload = CommunityReportCreate(
        username="anonymous_citizen",
        entity_type="scheme",
        title_en="Production persistence test",
        description_en="Must fail closed when PostgreSQL is unavailable",
    )
    with pytest.raises(HTTPException) as exc_info:
        create_community_report(payload, None)
    assert exc_info.value.status_code == 503
