from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, status

from app.auth import (
    CurrentAdmin,
    CurrentStaff,
    RequiredDb,
    create_staff_session,
    hash_password,
    verify_password,
)
from app.models.community import ModerationAuditRecord, StaffAccount, StaffSession
from app.schemas.staff import (
    StaffAccountCreate,
    StaffAccountOut,
    StaffLogin,
    StaffPasswordChange,
    StaffSessionOut,
)

router = APIRouter(prefix="/staff", tags=["staff"])


def normalize_email(email: str) -> str:
    normalized = email.strip().casefold()
    if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
        raise HTTPException(status_code=422, detail="A valid staff email address is required")
    return normalized


@router.post("/login", response_model=StaffSessionOut)
def login_staff(credentials: StaffLogin, db: RequiredDb) -> StaffSessionOut:
    email = normalize_email(credentials.email)
    staff = db.query(StaffAccount).filter(StaffAccount.email == email).first()
    now = datetime.now(UTC)
    if staff is not None and staff.locked_until is not None and staff.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Sign-in temporarily locked"
        )
    if staff is None or not verify_password(credentials.password, staff.password_hash):
        if staff is not None:
            staff.failed_login_attempts += 1
            if staff.failed_login_attempts >= 5:
                staff.locked_until = now + timedelta(minutes=15)
                staff.failed_login_attempts = 0
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not staff.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff account disabled")
    staff.failed_login_attempts = 0
    staff.locked_until = None
    staff.last_login_at = now
    token, session = create_staff_session(db, staff)
    return StaffSessionOut(
        access_token=token,
        expires_at=session.expires_at,
        staff=StaffAccountOut.model_validate(staff),
    )


@router.get("/me", response_model=StaffAccountOut)
def get_current_staff(staff: CurrentStaff) -> StaffAccount:
    return staff


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_staff(staff: CurrentStaff, db: RequiredDb) -> None:
    db.query(StaffSession).filter(
        StaffSession.staff_account_id == staff.id,
        StaffSession.revoked_at.is_(None),
    ).update({"revoked_at": datetime.now(UTC)})
    db.commit()


@router.post("/password", response_model=StaffSessionOut)
def change_staff_password(
    password_in: StaffPasswordChange,
    staff: CurrentStaff,
    db: RequiredDb,
) -> StaffSessionOut:
    if not verify_password(password_in.current_password, staff.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect"
        )
    try:
        staff.password_hash = hash_password(password_in.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    staff.must_change_password = False
    now = datetime.now(UTC)
    db.query(StaffSession).filter(
        StaffSession.staff_account_id == staff.id,
        StaffSession.revoked_at.is_(None),
    ).update({"revoked_at": now})
    db.commit()
    token, session = create_staff_session(db, staff)
    return StaffSessionOut(
        access_token=token,
        expires_at=session.expires_at,
        staff=StaffAccountOut.model_validate(staff),
    )


@router.get("/accounts", response_model=list[StaffAccountOut])
def list_staff_accounts(admin: CurrentAdmin, db: RequiredDb) -> list[StaffAccount]:
    del admin
    return db.query(StaffAccount).order_by(StaffAccount.created_at).all()


@router.post("/accounts", response_model=StaffAccountOut, status_code=status.HTTP_201_CREATED)
def create_staff_account(
    staff_in: StaffAccountCreate,
    admin: CurrentAdmin,
    db: RequiredDb,
) -> StaffAccount:
    email = normalize_email(staff_in.email)
    if db.query(StaffAccount).filter(StaffAccount.email == email).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Staff account already exists"
        )
    try:
        password_hash = hash_password(staff_in.temporary_password)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    staff = StaffAccount(
        email=email,
        display_name=staff_in.display_name.strip(),
        role=staff_in.role,
        password_hash=password_hash,
        must_change_password=True,
        created_by_staff_id=admin.id,
    )
    db.add(staff)
    db.flush()
    db.add(
        ModerationAuditRecord(
            moderator_id="Platform administrator",
            staff_account_id=admin.id,
            action="staff_created",
            target_type="staff_account",
            target_id=str(staff.id),
            reason="Moderator account created by an authenticated administrator",
            previous_state=None,
            new_state={"role": staff.role, "is_active": staff.is_active},
        )
    )
    db.commit()
    db.refresh(staff)
    return staff
