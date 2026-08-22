import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, status

from app.auth import CurrentAdmin, RequiredDb, hash_password, session_token_hash, verify_password
from app.config import load_settings
from app.models.professional import (
    ProfessionalAccount,
    ProfessionalAccountAuditRecord,
    ProfessionalEmailVerification,
    ProfessionalSession,
)
from app.professional_auth import CurrentProfessional, create_professional_session
from app.professional_email import (
    ProfessionalEmailUnavailable,
    send_professional_verification_email,
)
from app.schemas.professional import (
    ProfessionalAccountAdminUpdate,
    ProfessionalAccountAuditOut,
    ProfessionalAccountCreate,
    ProfessionalAccountOut,
    ProfessionalEmailVerificationIn,
    ProfessionalLogin,
    ProfessionalRegistrationAccepted,
    ProfessionalRegistrationStatus,
    ProfessionalSessionOut,
)

router = APIRouter(prefix="/professional", tags=["professional accounts"])
VERIFICATION_LIFETIME = timedelta(minutes=30)


def normalize_professional_email(email: str) -> str:
    normalized = email.strip().casefold()
    if (
        "@" not in normalized
        or normalized.startswith("@")
        or normalized.endswith("@")
        or any(char.isspace() for char in normalized)
    ):
        raise HTTPException(status_code=422, detail="A valid email address is required")
    return normalized


def validate_professional_access_update(
    account: ProfessionalAccount, update_in: ProfessionalAccountAdminUpdate
) -> None:
    if update_in.status == "active":
        if account.email_verified_at is None:
            raise HTTPException(status_code=409, detail="Email must be verified before activation")
        if update_in.access_plan == "none":
            raise HTTPException(status_code=422, detail="Active accounts require an access plan")
        if update_in.billing_status not in {"paid", "complimentary"}:
            raise HTTPException(
                status_code=422,
                detail="Active accounts require paid or complimentary billing status",
            )
    elif update_in.access_plan != "none":
        raise HTTPException(status_code=422, detail="Inactive accounts cannot retain paid access")


def create_verification(
    db: RequiredDb, account: ProfessionalAccount
) -> tuple[str, ProfessionalEmailVerification]:
    token = secrets.token_urlsafe(48)
    now = datetime.now(UTC)
    db.query(ProfessionalEmailVerification).filter(
        ProfessionalEmailVerification.professional_account_id == account.id,
        ProfessionalEmailVerification.consumed_at.is_(None),
    ).update({"consumed_at": now})
    verification = ProfessionalEmailVerification(
        professional_account_id=account.id,
        token_hash=session_token_hash(token),
        expires_at=now + VERIFICATION_LIFETIME,
    )
    db.add(verification)
    return token, verification


@router.get("/registration-status", response_model=ProfessionalRegistrationStatus)
def registration_status() -> ProfessionalRegistrationStatus:
    settings = load_settings()
    return ProfessionalRegistrationStatus(
        registration_enabled=settings.professional_registration_enabled,
        email_verification_available=settings.professional_email_configured,
    )


@router.post(
    "/register",
    response_model=ProfessionalRegistrationAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
def register_professional(
    account_in: ProfessionalAccountCreate, db: RequiredDb
) -> ProfessionalRegistrationAccepted:
    settings = load_settings()
    if not settings.professional_registration_enabled:
        raise HTTPException(status_code=403, detail="Professional registration is not open")
    if not settings.professional_email_configured:
        raise HTTPException(
            status_code=503, detail="Professional email verification is not configured"
        )
    email = normalize_professional_email(account_in.email)
    existing = db.query(ProfessionalAccount).filter(ProfessionalAccount.email == email).first()
    if existing is not None:
        if existing.email_verified_at is not None or not verify_password(
            account_in.password, existing.password_hash
        ):
            return ProfessionalRegistrationAccepted()
        account = existing
    else:
        try:
            password_hash = hash_password(account_in.password)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        now = datetime.now(UTC)
        account = ProfessionalAccount(
            email=email,
            display_name=account_in.display_name.strip(),
            organization_name=account_in.organization_name.strip(),
            password_hash=password_hash,
            requested_plan=account_in.requested_plan,
            access_plan="none",
            status="pending_verification",
            terms_accepted_at=now,
        )
        db.add(account)
        db.flush()
        db.add(
            ProfessionalAccountAuditRecord(
                professional_account_id=account.id,
                action="account_registered",
                reason="Professional account self-registration accepted",
                new_state={
                    "status": account.status,
                    "requested_plan": account.requested_plan,
                },
            )
        )
    token, _verification = create_verification(db, account)
    db.commit()
    try:
        send_professional_verification_email(
            settings,
            recipient=account.email,
            display_name=account.display_name,
            token=token,
        )
    except ProfessionalEmailUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ProfessionalRegistrationAccepted()


@router.post("/verify-email", response_model=ProfessionalAccountOut)
def verify_professional_email(
    verification_in: ProfessionalEmailVerificationIn, db: RequiredDb
) -> ProfessionalAccount:
    now = datetime.now(UTC)
    verification = (
        db.query(ProfessionalEmailVerification)
        .filter(
            ProfessionalEmailVerification.token_hash == session_token_hash(verification_in.token),
            ProfessionalEmailVerification.consumed_at.is_(None),
            ProfessionalEmailVerification.expires_at > now,
        )
        .first()
    )
    if verification is None:
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")
    account = (
        db.query(ProfessionalAccount)
        .filter(ProfessionalAccount.id == verification.professional_account_id)
        .first()
    )
    if account is None:
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")
    previous_state = {"status": account.status, "email_verified": False}
    verification.consumed_at = now
    account.email_verified_at = now
    account.status = "pending_review"
    db.add(
        ProfessionalAccountAuditRecord(
            professional_account_id=account.id,
            action="email_verified",
            reason="Email ownership verified through a single-use expiring token",
            previous_state=previous_state,
            new_state={"status": account.status, "email_verified": True},
        )
    )
    db.commit()
    db.refresh(account)
    return account


@router.post("/login", response_model=ProfessionalSessionOut)
def login_professional(credentials: ProfessionalLogin, db: RequiredDb) -> ProfessionalSessionOut:
    email = normalize_professional_email(credentials.email)
    account = db.query(ProfessionalAccount).filter(ProfessionalAccount.email == email).first()
    now = datetime.now(UTC)
    if account is not None and account.locked_until is not None and account.locked_until > now:
        raise HTTPException(status_code=429, detail="Sign-in temporarily locked")
    if account is None or not verify_password(credentials.password, account.password_hash):
        if account is not None:
            account.failed_login_attempts += 1
            if account.failed_login_attempts >= 5:
                account.locked_until = now + timedelta(minutes=15)
                account.failed_login_attempts = 0
            db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if account.email_verified_at is None:
        raise HTTPException(status_code=403, detail="Email verification required")
    if account.status == "pending_review":
        raise HTTPException(status_code=403, detail="Account awaiting administrator approval")
    if (
        account.status != "active"
        or account.access_plan == "none"
        or account.billing_status not in {"paid", "complimentary"}
    ):
        raise HTTPException(status_code=403, detail="Professional account is not active")
    account.failed_login_attempts = 0
    account.locked_until = None
    account.last_login_at = now
    token, session = create_professional_session(db, account)
    return ProfessionalSessionOut(
        access_token=token,
        expires_at=session.expires_at,
        account=ProfessionalAccountOut.model_validate(account),
    )


@router.get("/me", response_model=ProfessionalAccountOut)
def get_current_professional(account: CurrentProfessional) -> ProfessionalAccount:
    return account


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_professional(account: CurrentProfessional, db: RequiredDb) -> None:
    db.query(ProfessionalSession).filter(
        ProfessionalSession.professional_account_id == account.id,
        ProfessionalSession.revoked_at.is_(None),
    ).update({"revoked_at": datetime.now(UTC)})
    db.commit()


@router.get("/admin/accounts", response_model=list[ProfessionalAccountOut])
def list_professional_accounts(admin: CurrentAdmin, db: RequiredDb) -> list[ProfessionalAccount]:
    del admin
    return db.query(ProfessionalAccount).order_by(ProfessionalAccount.created_at.desc()).all()


@router.get("/admin/audit", response_model=list[ProfessionalAccountAuditOut])
def list_professional_account_audit(
    admin: CurrentAdmin, db: RequiredDb
) -> list[ProfessionalAccountAuditRecord]:
    del admin
    return (
        db.query(ProfessionalAccountAuditRecord)
        .order_by(ProfessionalAccountAuditRecord.created_at.desc())
        .limit(200)
        .all()
    )


@router.patch("/admin/accounts/{account_id}", response_model=ProfessionalAccountOut)
def update_professional_account(
    account_id: uuid.UUID,
    update_in: ProfessionalAccountAdminUpdate,
    admin: CurrentAdmin,
    db: RequiredDb,
) -> ProfessionalAccount:
    account = db.query(ProfessionalAccount).filter(ProfessionalAccount.id == account_id).first()
    if account is None:
        raise HTTPException(status_code=404, detail="Professional account not found")
    validate_professional_access_update(account, update_in)
    previous_state = {
        "status": account.status,
        "access_plan": account.access_plan,
        "billing_status": account.billing_status,
    }
    account.status = update_in.status
    account.access_plan = update_in.access_plan
    account.billing_status = update_in.billing_status
    db.query(ProfessionalSession).filter(
        ProfessionalSession.professional_account_id == account.id,
        ProfessionalSession.revoked_at.is_(None),
    ).update({"revoked_at": datetime.now(UTC)})
    db.add(
        ProfessionalAccountAuditRecord(
            professional_account_id=account.id,
            staff_account_id=admin.id,
            action="access_changed",
            reason=update_in.reason.strip(),
            previous_state=previous_state,
            new_state={
                "status": account.status,
                "access_plan": account.access_plan,
                "billing_status": account.billing_status,
            },
        )
    )
    db.commit()
    db.refresh(account)
    return account
