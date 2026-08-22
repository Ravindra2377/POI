import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.auth import RequiredDb, session_token_hash
from app.models.professional import ProfessionalAccount, ProfessionalSession

PROFESSIONAL_SESSION_LIFETIME = timedelta(hours=24)


def create_professional_session(
    db: RequiredDb, account: ProfessionalAccount
) -> tuple[str, ProfessionalSession]:
    token = secrets.token_urlsafe(48)
    now = datetime.now(UTC)
    session = ProfessionalSession(
        professional_account_id=account.id,
        token_hash=session_token_hash(token),
        expires_at=now + PROFESSIONAL_SESSION_LIFETIME,
        last_used_at=now,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return token, session


def require_professional_account(
    db: RequiredDb,
    authorization: Annotated[str | None, Header()] = None,
) -> ProfessionalAccount:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Professional sign-in required",
        )
    token = authorization.removeprefix("Bearer ").strip()
    now = datetime.now(UTC)
    session = (
        db.query(ProfessionalSession)
        .filter(
            ProfessionalSession.token_hash == session_token_hash(token),
            ProfessionalSession.revoked_at.is_(None),
            ProfessionalSession.expires_at > now,
        )
        .first()
    )
    if session is None:
        raise HTTPException(status_code=401, detail="Invalid professional session")
    account = (
        db.query(ProfessionalAccount)
        .filter(ProfessionalAccount.id == session.professional_account_id)
        .first()
    )
    if (
        account is None
        or account.status != "active"
        or account.email_verified_at is None
        or account.access_plan == "none"
        or account.billing_status not in {"paid", "complimentary"}
    ):
        raise HTTPException(status_code=403, detail="Professional account is not active")
    session.last_used_at = now
    db.commit()
    return account


CurrentProfessional = Annotated[ProfessionalAccount, Depends(require_professional_account)]
