from fastapi.testclient import TestClient

from app.main import app

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
