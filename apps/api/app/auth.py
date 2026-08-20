import hashlib
import hmac
import secrets
from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import DatabaseConfigurationError, get_db
from app.models.community import StaffAccount, StaffSession

PASSWORD_SCHEME = "scrypt-v1"
SESSION_LIFETIME = timedelta(hours=8)


def validate_password_strength(password: str) -> None:
    if len(password) < 14:
        raise ValueError("Password must contain at least 14 characters")
    categories = (
        any(char.islower() for char in password),
        any(char.isupper() for char in password),
        any(char.isdigit() for char in password),
        any(not char.isalnum() for char in password),
    )
    if sum(categories) < 3:
        raise ValueError("Password must use at least three character categories")


def hash_password(password: str) -> str:
    validate_password_strength(password)
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"{PASSWORD_SCHEME}$16384$8$1${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, n, r, p, salt, expected = encoded.split("$", 5)
        if scheme != PASSWORD_SCHEME:
            return False
        digest = hashlib.scrypt(
            password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), dklen=32
        )
        return hmac.compare_digest(digest.hex(), expected)
    except (ValueError, TypeError):
        return False


def session_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_staff_session(db: Session, staff: StaffAccount) -> tuple[str, StaffSession]:
    token = secrets.token_urlsafe(48)
    now = datetime.now(UTC)
    session = StaffSession(
        staff_account_id=staff.id,
        token_hash=session_token_hash(token),
        expires_at=now + SESSION_LIFETIME,
        last_used_at=now,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return token, session


def get_required_db() -> Generator[Session, None, None]:
    try:
        generator = get_db()
        db = next(generator)
        try:
            yield db
        finally:
            next(generator, None)
    except DatabaseConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Staff authentication requires the production database",
        ) from exc


RequiredDb = Annotated[Session, Depends(get_required_db)]


def require_staff(
    db: RequiredDb,
    authorization: Annotated[str | None, Header()] = None,
) -> StaffAccount:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Staff sign-in required"
        )
    token = authorization.removeprefix("Bearer ").strip()
    now = datetime.now(UTC)
    session = (
        db.query(StaffSession)
        .filter(
            StaffSession.token_hash == session_token_hash(token),
            StaffSession.revoked_at.is_(None),
            StaffSession.expires_at > now,
        )
        .first()
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    staff = db.query(StaffAccount).filter(StaffAccount.id == session.staff_account_id).first()
    if staff is None or not staff.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff account disabled")
    session.last_used_at = now
    db.commit()
    return staff


CurrentStaff = Annotated[StaffAccount, Depends(require_staff)]


def require_admin(staff: CurrentStaff) -> StaffAccount:
    if staff.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return staff


CurrentAdmin = Annotated[StaffAccount, Depends(require_admin)]
