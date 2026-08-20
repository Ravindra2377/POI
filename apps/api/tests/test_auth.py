import pytest

from app.auth import hash_password, session_token_hash, validate_password_strength, verify_password
from app.schemas.community import ModerationActionCreate


def test_staff_passwords_are_salted_and_verifiable() -> None:
    password = "A-strong-admin-password-2026"
    first = hash_password(password)
    second = hash_password(password)

    assert first != second
    assert verify_password(password, first)
    assert not verify_password("wrong-password", first)


@pytest.mark.parametrize("password", ["short", "alllowercasebutlong", "1234567890123456"])
def test_staff_password_policy_rejects_weak_passwords(password: str) -> None:
    with pytest.raises(ValueError):
        validate_password_strength(password)


def test_staff_session_tokens_are_only_stored_as_hashes() -> None:
    assert session_token_hash("secret-token") != "secret-token"
    assert len(session_token_hash("secret-token")) == 64


def test_moderation_payload_cannot_claim_a_moderator_identity() -> None:
    payload = ModerationActionCreate.model_validate(
        {
            "moderator_id": "claimed-admin",
            "action": "approve",
            "target_type": "report",
            "target_id": "11111111-1111-1111-1111-111111111111",
            "reason": "Reviewed against the moderation policy",
        }
    )
    assert not hasattr(payload, "moderator_id")
