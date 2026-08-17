from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_user_account_lifecycle() -> None:
    # 1. Create account
    res = client.post(
        "/api/v1/community/users",
        json={
            "username": "citizen_ravi",
            "display_name": "Ravi Kumar",
            "consent_data_sharing": True,
            "consent_public_activity": True,
            "preferred_language": "te",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == "citizen_ravi"
    assert data["display_name"] == "Ravi Kumar"
    assert data["preferred_language"] == "te"

    # 2. Get account
    res_get = client.get("/api/v1/community/users/citizen_ravi")
    assert res_get.status_code == 200
    assert res_get.json()["display_name"] == "Ravi Kumar"


def test_community_polls_and_voting() -> None:
    # 1. List polls
    res = client.get("/api/v1/community/polls")
    assert res.status_code == 200
    polls = res.json()
    assert len(polls) >= 2
    poll = polls[0]
    assert "Non-representative Community Pulse" in poll["non_representative_disclaimer"]

    # 2. Vote on poll
    poll_id = poll["id"]
    vote_res = client.post(
        f"/api/v1/community/polls/{poll_id}/vote",
        json={
            "username": "citizen_ravi",
            "poll_id": poll_id,
            "option_id": poll["options"][0]["id"],
        },
    )
    assert vote_res.status_code == 200
    updated_poll = vote_res.json()
    assert updated_poll["total_votes"] == poll["total_votes"] + 1


def test_community_reports_and_moderation() -> None:
    # 1. Create evidence report
    rep_res = client.post(
        "/api/v1/community/reports",
        json={
            "username": "citizen_ravi",
            "entity_type": "scheme",
            "entity_id": "ysr-rythu-bharosa",
            "title_en": "Delayed mandal payment disbursement",
            "description_en": "Observed 3 weeks delay in mandal office processing",
            "evidence_urls": ["https://example.com/receipt.pdf"],
        },
    )
    assert rep_res.status_code == 201
    report = rep_res.json()
    assert report["classification"] == "community_reported"
    assert report["title_en"] == "Delayed mandal payment disbursement"

    # 2. Execute moderation action
    mod_res = client.post(
        "/api/v1/community/moderation",
        json={
            "moderator_id": "mod_admin_1",
            "action": "flag",
            "target_type": "report",
            "target_id": report["id"],
            "reason": "Requires field verification",
            "new_status": "flagged",
        },
    )
    assert mod_res.status_code == 201
    audit = mod_res.json()
    assert audit["action"] == "flag"
    assert audit["moderator_id"] == "mod_admin_1"

    # 3. List moderation log
    log_res = client.get("/api/v1/community/moderation-log")
    assert log_res.status_code == 200
    log = log_res.json()
    assert len(log) >= 1
    assert log[0]["reason"] == "Requires field verification"
