from fastapi.testclient import TestClient

from app.main import app, get_readiness_checker


def test_geography_pagination_and_public_authorization(client: TestClient) -> None:
    response = client.get("/api/v1/geographies?page=2&page_size=10")

    assert response.status_code == 200
    assert response.json()["meta"] == {
        "page": 2,
        "page_size": 10,
        "total": 1,
        "total_pages": 1,
    }


def test_alias_and_telugu_search(client: TestClient) -> None:
    alias_response = client.get("/api/v1/geographies?q=Vizag")
    telugu_response = client.get("/api/v1/geographies", params={"q": "విశాఖపట్నం"})

    assert alias_response.json()["data"][0]["slug"] == "visakhapatnam"
    assert telugu_response.json()["data"][0]["name_te"] == "విశాఖపట్నం"


def test_government_body_detail_and_source_summary(client: TestClient) -> None:
    response = client.get("/api/v1/government-bodies/school-education")

    assert response.status_code == 200
    assert response.json()["sector"] == "education"
    assert response.json()["provenance"]["review_status"] == "reviewed"


def test_empty_public_offices_and_representatives(client: TestClient) -> None:
    offices = client.get("/api/v1/public-offices")
    representatives = client.get("/api/v1/representatives")

    assert offices.json()["data"] == []
    assert offices.json()["meta"]["total"] == 0
    assert representatives.json()["data"] == []


def test_structured_not_found_and_validation_errors(client: TestClient) -> None:
    missing = client.get("/api/v1/geographies/not-real")
    invalid = client.get("/api/v1/geographies?page=0")

    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "validation_error"


def test_read_endpoints_are_public_but_not_writable(client: TestClient) -> None:
    assert client.get("/api/v1/geographies").status_code == 200
    assert client.post("/api/v1/geographies", json={}).status_code == 405


def test_live_and_ready_health_are_distinct(client: TestClient) -> None:
    assert client.get("/health/live").json()["status"] == "ok"
    ready = client.get("/health/ready")

    assert ready.status_code == 200
    assert ready.json()["database"] == "ok"
    assert ready.json()["postgis_version"] == "3.5.2"


def test_readiness_failure_does_not_break_liveness(client: TestClient) -> None:
    def fail() -> str:
        raise RuntimeError("database unavailable")

    app.dependency_overrides[get_readiness_checker] = lambda: fail

    assert client.get("/health/live").status_code == 200
    ready = client.get("/health/ready")
    assert ready.status_code == 503
    assert ready.json()["status"] == "not_ready"
