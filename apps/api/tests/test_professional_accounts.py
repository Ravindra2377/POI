from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.api.v1.professional import (
    normalize_professional_email,
    register_professional,
    registration_status,
    validate_professional_access_update,
)
from app.models.professional import ProfessionalAccount
from app.schemas.professional import ProfessionalAccountAdminUpdate, ProfessionalAccountCreate


def account(*, verified: bool = True) -> ProfessionalAccount:
    now = datetime.now(UTC)
    return ProfessionalAccount(
        email="researcher@example.org",
        display_name="Researcher",
        organization_name="Public Interest Lab",
        password_hash="not-used-in-policy-tests",
        requested_plan="professional",
        access_plan="none",
        billing_status="not_started",
        status="pending_review",
        email_verified_at=now if verified else None,
        terms_accepted_at=now,
    )


def update(
    *,
    status: str = "active",
    access_plan: str = "professional",
    billing_status: str = "paid",
) -> ProfessionalAccountAdminUpdate:
    return ProfessionalAccountAdminUpdate.model_validate(
        {
            "status": status,
            "access_plan": access_plan,
            "billing_status": billing_status,
            "reason": "Approved after documented commercial review",
        }
    )


def test_production_professional_registration_fails_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("PROFESSIONAL_REGISTRATION_ENABLED", raising=False)

    assert registration_status().registration_enabled is False

    payload = ProfessionalAccountCreate.model_validate(
        {
            "email": "researcher@example.org",
            "display_name": "Researcher",
            "organization_name": "Public Interest Lab",
            "password": "Strong-professional-password-2026",
            "requested_plan": "professional",
            "accept_terms": True,
        }
    )
    with pytest.raises(HTTPException) as caught:
        register_professional(payload, None)  # type: ignore[arg-type]
    assert caught.value.status_code == 403


def test_professional_email_is_normalized_without_linking_citizen_identity() -> None:
    assert normalize_professional_email("  Researcher@Example.ORG ") == "researcher@example.org"
    with pytest.raises(HTTPException):
        normalize_professional_email("not an email")


def test_activation_requires_verified_email_plan_and_eligible_billing() -> None:
    with pytest.raises(HTTPException) as unverified:
        validate_professional_access_update(account(verified=False), update())
    assert unverified.value.status_code == 409

    with pytest.raises(HTTPException) as no_plan:
        validate_professional_access_update(account(), update(access_plan="none"))
    assert no_plan.value.status_code == 422

    with pytest.raises(HTTPException) as unpaid:
        validate_professional_access_update(account(), update(billing_status="payment_pending"))
    assert unpaid.value.status_code == 422

    validate_professional_access_update(account(), update())
    validate_professional_access_update(account(), update(billing_status="complimentary"))


def test_inactive_professional_account_cannot_retain_access_plan() -> None:
    with pytest.raises(HTTPException) as caught:
        validate_professional_access_update(
            account(),
            update(status="suspended", access_plan="organization", billing_status="past_due"),
        )
    assert caught.value.status_code == 422


def test_professional_migration_keeps_customer_identity_isolated_and_audited() -> None:
    migration = (
        Path(__file__).parents[1]
        / "alembic"
        / "versions"
        / "20260822_0008_professional_accounts.py"
    ).read_text(encoding="utf-8")

    assert '"professional_accounts"' in migration
    assert '"professional_sessions"' in migration
    assert '"professional_email_verifications"' in migration
    assert '"professional_account_audit_records"' in migration
    assert 'ForeignKey("staff_accounts.id"' in migration
    assert "citizen_profiles" not in migration
    assert 'sa.Column("password_hash"' in migration
    assert 'sa.Column("token_hash"' in migration
    assert 'sa.Column("password"' not in migration
