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


def test_ingestion_feed_status_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/ingestion/feeds")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    feed = body[0]
    assert feed["source"]["name"] == "Local Government Directory district list"
    assert feed["source"]["official_source_url"].startswith("https://lgdirectory.gov.in/")
    assert feed["source"]["public_source_url"] == "https://lgdirectory.gov.in/"
    assert feed["latest_snapshot"]["sha256"] == "a" * 64
    assert feed["latest_extraction"]["extracted_record_count"] == 28
    assert feed["observation_counts"] == {"total": 112, "published": 112}
    assert feed["latest_review"]["decision"] == "approve"
    assert "reviewer_identity" not in feed["latest_review"]


def test_scheme_catalogue_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/schemes")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "reviewed"
    assert body["telugu_reviewed"] is False
    assert len(body["data"]) == 1
    scheme = body["data"][0]
    assert scheme["slug"] == "ysrrb"
    assert scheme["name"]["classification"] == "official"
    assert scheme["name"]["value"]["en"] == "YSR Rythu Bharosa"
    assert scheme["name"]["value"]["te"] == ""
    assert scheme["department"] is None
    assert scheme["districts"] is None
    assert scheme["eligibility"] is None
    assert scheme["name"]["source"]["source_name"].startswith("myScheme")
    assert scheme["name"]["source"]["review_status"] == "reviewed"
    assert scheme["name"]["source"]["public_source_url"].startswith(
        "https://www.myscheme.gov.in/"
    )


def test_budget_catalogue_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/budget")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "reviewed"
    assert len(body["data"]) == 1
    line = body["data"][0]
    assert line["slug"] == "2022-23-revenue_receipts-0202-education-sports-art-and-culture"
    assert line["fiscal_year"] == "2022-23"
    assert line["statement"] == "revenue_receipts"
    assert line["code"] == "0202"
    assert line["name"]["classification"] == "official"
    assert line["name"]["value"]["en"] == "Education, Sports, Art and Culture"
    assert line["name"]["value"]["te"] == ""
    assert line["unit"] == "Thousands"
    assert len(line["amounts"]) == 4
    assert line["amounts"][0]["label"] == "accounts"
    assert line["amounts"][3]["label"] == "budget"
    assert line["amounts"][3]["value_text"] == "89,57,00"
    assert line["budget_estimate"]["value"]["en"] == "89,57,00"
    assert line["source"]["source_name"].startswith("Annual Financial Statement")
    assert line["source"]["public_source_url"] == "https://apfinance.gov.in/budget.html"
    assert line["source"]["review_status"] == "reviewed"


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
