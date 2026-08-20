import uuid
from collections.abc import Generator
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import CurrentStaff, RequiredDb
from app.db import DatabaseConfigurationError, get_db
from app.models.community import (
    CommunityComment,
    CommunityReport,
    ModerationAuditRecord,
    UserAccount,
)
from app.schemas.community import (
    CommunityCommentCreate,
    CommunityCommentOut,
    CommunityPollOut,
    CommunityReportCreate,
    CommunityReportOut,
    ModerationActionCreate,
    ModerationAuditRecordOut,
    PollOption,
    PollVoteCreate,
    PollVoteOut,
    UserAccountCreate,
    UserAccountOut,
)

router = APIRouter(prefix="/community", tags=["community"])


def get_optional_db() -> Generator[Session | None, None, None]:
    try:
        gen = get_db()
        db = next(gen)
        try:
            yield db
        finally:
            next(gen, None)
    except DatabaseConfigurationError:
        yield None


DbSession = Annotated[Any, Depends(get_optional_db)]


# In-memory fallback database for non-postgres / prepared states
_IN_MEMORY_USERS: dict[str, UserAccountOut] = {}
_IN_MEMORY_REPORTS: list[CommunityReportOut] = []
_IN_MEMORY_POLLS: list[CommunityPollOut] = []
_IN_MEMORY_VOTES: list[PollVoteOut] = []
_IN_MEMORY_COMMENTS: list[CommunityCommentOut] = []
_IN_MEMORY_MODERATION_LOG: list[ModerationAuditRecordOut] = []


def _get_default_polls() -> list[CommunityPollOut]:
    return []


@router.post("/users", response_model=UserAccountOut, status_code=status.HTTP_201_CREATED)
def create_user_account(user_in: UserAccountCreate, db: DbSession) -> Any:
    """Register or update a pseudonymous citizen user account with consent preferences."""
    if db is not None:
        try:
            db_existing = (
                db.query(UserAccount).filter(UserAccount.username == user_in.username).first()
            )
            if db_existing:
                db_existing.display_name = user_in.display_name
                db_existing.district_id = user_in.district_id
                db_existing.consent_data_sharing = user_in.consent_data_sharing
                db_existing.consent_public_activity = user_in.consent_public_activity
                db_existing.preferred_language = user_in.preferred_language
                db.commit()
                db.refresh(db_existing)
                return db_existing
            account = UserAccount(
                id=uuid.uuid4(),
                username=user_in.username,
                display_name=user_in.display_name,
                district_id=user_in.district_id,
                consent_data_sharing=user_in.consent_data_sharing,
                consent_public_activity=user_in.consent_public_activity,
                preferred_language=user_in.preferred_language,
            )
            db.add(account)
            db.commit()
            db.refresh(account)
            return account
        except Exception:
            db.rollback()

    account_out = UserAccountOut(
        id=uuid.uuid4(),
        username=user_in.username,
        display_name=user_in.display_name,
        district_id=user_in.district_id,
        consent_data_sharing=user_in.consent_data_sharing,
        consent_public_activity=user_in.consent_public_activity,
        preferred_language=user_in.preferred_language,
        created_at=datetime.now(UTC),
    )
    _IN_MEMORY_USERS[user_in.username] = account_out
    return account_out


@router.get("/users/{username}", response_model=UserAccountOut)
def get_user_account(username: str, db: DbSession) -> Any:
    """Get pseudonymous user account by username."""
    if db is not None:
        db_account = db.query(UserAccount).filter(UserAccount.username == username).first()
        if db_account:
            return db_account

    if username in _IN_MEMORY_USERS:
        return _IN_MEMORY_USERS[username]

    raise HTTPException(status_code=404, detail="User account not found")


@router.post("/reports", response_model=CommunityReportOut, status_code=status.HTTP_201_CREATED)
def create_community_report(report_in: CommunityReportCreate, db: DbSession) -> Any:
    """Submit a structured citizen evidence report (tagged as Community-reported)."""
    user_id = uuid.uuid4()
    if username_account := _IN_MEMORY_USERS.get(report_in.username):
        user_id = username_account.id

    if db is not None:
        try:
            db_acc = (
                db.query(UserAccount).filter(UserAccount.username == report_in.username).first()
            )
            if db_acc:
                user_id = db_acc.id
            report = CommunityReport(
                id=uuid.uuid4(),
                user_id=user_id,
                entity_type=report_in.entity_type,
                entity_id=report_in.entity_id,
                district_id=report_in.district_id,
                title_en=report_in.title_en,
                title_te=report_in.title_te,
                description_en=report_in.description_en,
                description_te=report_in.description_te,
                classification="community_reported",
                evidence_urls=report_in.evidence_urls,
                status="pending_review",
            )
            db.add(report)
            db.commit()
            db.refresh(report)
            return CommunityReportOut(
                id=report.id,
                user_id=report.user_id,
                username=report_in.username,
                entity_type=report.entity_type,
                entity_id=report.entity_id,
                district_id=report.district_id,
                title_en=report.title_en,
                title_te=report.title_te,
                description_en=report.description_en,
                description_te=report.description_te,
                classification=report.classification,
                evidence_urls=report.evidence_urls,
                status=report.status,
                created_at=report.created_at,
            )
        except Exception:
            db.rollback()

    report_out = CommunityReportOut(
        id=uuid.uuid4(),
        user_id=user_id,
        username=report_in.username,
        entity_type=report_in.entity_type,
        entity_id=report_in.entity_id,
        district_id=report_in.district_id,
        title_en=report_in.title_en,
        title_te=report_in.title_te,
        description_en=report_in.description_en,
        description_te=report_in.description_te,
        classification="community_reported",
        evidence_urls=report_in.evidence_urls,
        status="pending_review",
        created_at=datetime.now(UTC),
    )
    _IN_MEMORY_REPORTS.insert(0, report_out)
    return report_out


@router.get("/reports", response_model=list[CommunityReportOut])
def list_community_reports(
    db: DbSession,
    entity_type: str | None = None,
    entity_id: str | None = None,
) -> Any:
    """List published community evidence reports."""
    if db is not None:
        try:
            query = (
                db.query(CommunityReport, UserAccount.username)
                .join(UserAccount, CommunityReport.user_id == UserAccount.id)
                .filter(CommunityReport.status == "published")
            )
            if entity_type:
                query = query.filter(CommunityReport.entity_type == entity_type)
            if entity_id:
                query = query.filter(CommunityReport.entity_id == entity_id)
            results = query.order_by(CommunityReport.created_at.desc()).all()
            return [
                CommunityReportOut(
                    id=rep.id,
                    user_id=rep.user_id,
                    username=uname,
                    entity_type=rep.entity_type,
                    entity_id=rep.entity_id,
                    district_id=rep.district_id,
                    title_en=rep.title_en,
                    title_te=rep.title_te,
                    description_en=rep.description_en,
                    description_te=rep.description_te,
                    classification=rep.classification,
                    evidence_urls=rep.evidence_urls,
                    status=rep.status,
                    created_at=rep.created_at,
                )
                for rep, uname in results
            ]
        except Exception:
            pass

    filtered = _IN_MEMORY_REPORTS
    if entity_type:
        filtered = [r for r in filtered if r.entity_type == entity_type]
    if entity_id:
        filtered = [r for r in filtered if r.entity_id == entity_id]
    return filtered


@router.get("/polls", response_model=list[CommunityPollOut])
def list_community_polls() -> Any:
    """List active community pulse polls with option breakdowns and Rule #5 non-rep label."""
    return _get_default_polls()


@router.post("/polls/{poll_id}/vote", response_model=CommunityPollOut)
def vote_community_poll(poll_id: uuid.UUID, vote_in: PollVoteCreate) -> Any:
    """Record a non-representative poll vote and return updated breakdown."""
    polls = _get_default_polls()
    poll = next((p for p in polls if p.id == poll_id), None)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    updated_options: list[PollOption] = []
    for opt in poll.options:
        if opt.id == vote_in.option_id:
            updated_options.append(
                PollOption(
                    id=opt.id,
                    label_en=opt.label_en,
                    label_te=opt.label_te,
                    vote_count=opt.vote_count + 1,
                )
            )
        else:
            updated_options.append(opt)

    poll.options = updated_options
    poll.total_votes += 1
    return poll


@router.post("/comments", response_model=CommunityCommentOut, status_code=status.HTTP_201_CREATED)
def create_community_comment(comment_in: CommunityCommentCreate, db: DbSession) -> Any:
    """Post a citizen review or discussion comment."""
    user_id = uuid.uuid4()
    if username_account := _IN_MEMORY_USERS.get(comment_in.username):
        user_id = username_account.id

    if db is not None:
        try:
            db_a = db.query(UserAccount).filter(UserAccount.username == comment_in.username).first()
            if db_a:
                user_id = db_a.id
            comment = CommunityComment(
                id=uuid.uuid4(),
                user_id=user_id,
                target_type=comment_in.target_type,
                target_id=comment_in.target_id,
                rating=comment_in.rating,
                content_en=comment_in.content_en,
                content_te=comment_in.content_te,
                status="pending_review",
            )
            db.add(comment)
            db.commit()
            db.refresh(comment)
            return CommunityCommentOut(
                id=comment.id,
                user_id=comment.user_id,
                username=comment_in.username,
                target_type=comment.target_type,
                target_id=comment.target_id,
                rating=comment.rating,
                content_en=comment.content_en,
                content_te=comment.content_te,
                status=comment.status,
                created_at=comment.created_at,
            )
        except Exception:
            db.rollback()

    comment_out = CommunityCommentOut(
        id=uuid.uuid4(),
        user_id=user_id,
        username=comment_in.username,
        target_type=comment_in.target_type,
        target_id=comment_in.target_id,
        rating=comment_in.rating,
        content_en=comment_in.content_en,
        content_te=comment_in.content_te,
        status="pending_review",
        created_at=datetime.now(UTC),
    )
    _IN_MEMORY_COMMENTS.insert(0, comment_out)
    return comment_out


@router.get("/comments", response_model=list[CommunityCommentOut])
def list_community_comments(
    db: DbSession,
    target_type: str | None = None,
    target_id: str | None = None,
) -> Any:
    """List published community reviews and comments."""
    if db is not None:
        try:
            query = (
                db.query(CommunityComment, UserAccount.username)
                .join(UserAccount, CommunityComment.user_id == UserAccount.id)
                .filter(CommunityComment.status == "published")
            )
            if target_type:
                query = query.filter(CommunityComment.target_type == target_type)
            if target_id:
                query = query.filter(CommunityComment.target_id == target_id)
            results = query.order_by(CommunityComment.created_at.desc()).all()
            return [
                CommunityCommentOut(
                    id=c.id,
                    user_id=c.user_id,
                    username=uname,
                    target_type=c.target_type,
                    target_id=c.target_id,
                    rating=c.rating,
                    content_en=c.content_en,
                    content_te=c.content_te,
                    status=c.status,
                    created_at=c.created_at,
                )
                for c, uname in results
            ]
        except Exception:
            pass

    filtered = _IN_MEMORY_COMMENTS
    if target_type:
        filtered = [c for c in filtered if c.target_type == target_type]
    if target_id:
        filtered = [c for c in filtered if c.target_id == target_id]
    return filtered


@router.get("/moderation-queue")
def list_moderation_queue(db: RequiredDb, staff: CurrentStaff) -> list[dict[str, Any]]:
    """Return unpublished community content to authenticated staff only."""
    if staff.must_change_password:
        raise HTTPException(
            status_code=403,
            detail="Change the temporary password before moderating",
        )
    reports = (
        db.query(CommunityReport, UserAccount.username)
        .join(UserAccount, CommunityReport.user_id == UserAccount.id)
        .filter(CommunityReport.status.in_(("pending_review", "flagged")))
        .order_by(CommunityReport.created_at)
        .all()
    )
    comments = (
        db.query(CommunityComment, UserAccount.username)
        .join(UserAccount, CommunityComment.user_id == UserAccount.id)
        .filter(CommunityComment.status.in_(("pending_review", "flagged")))
        .order_by(CommunityComment.created_at)
        .all()
    )
    return [
        {
            "target_type": "report",
            "target_id": str(report.id),
            "username": username,
            "summary": report.title_en,
            "status": report.status,
            "created_at": report.created_at,
        }
        for report, username in reports
    ] + [
        {
            "target_type": "comment",
            "target_id": str(comment.id),
            "username": username,
            "summary": comment.content_en,
            "status": comment.status,
            "created_at": comment.created_at,
        }
        for comment, username in comments
    ]


@router.post(
    "/moderation",
    response_model=ModerationAuditRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def execute_moderation_action(
    mod_in: ModerationActionCreate,
    db: RequiredDb,
    staff: CurrentStaff,
) -> Any:
    """Apply an authenticated moderation transition and append its audit record."""
    if staff.must_change_password:
        raise HTTPException(
            status_code=403, detail="Change the temporary password before moderating"
        )

    target: CommunityReport | CommunityComment | None
    if mod_in.target_type == "report":
        target = db.query(CommunityReport).filter(CommunityReport.id == mod_in.target_id).first()
    else:
        target = db.query(CommunityComment).filter(CommunityComment.id == mod_in.target_id).first()
    if target is None:
        raise HTTPException(status_code=404, detail="Moderation target not found")

    next_status = {
        "approve": "published",
        "flag": "flagged",
        "hide": "hidden",
        "restore": "published",
    }[mod_in.action]
    previous_state = {"status": target.status}
    target.status = next_status
    audit = ModerationAuditRecord(
        id=uuid.uuid4(),
        moderator_id=f"Platform {staff.role}",
        staff_account_id=staff.id,
        action=mod_in.action,
        target_type=mod_in.target_type,
        target_id=str(mod_in.target_id),
        reason=mod_in.reason,
        previous_state=previous_state,
        new_state={"status": next_status},
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


@router.get("/moderation-log", response_model=list[ModerationAuditRecordOut])
def list_moderation_audit_log(db: DbSession) -> Any:
    """Public audit log of all moderation actions taken on the platform."""
    if db is not None:
        try:
            records = (
                db.query(ModerationAuditRecord)
                .order_by(ModerationAuditRecord.created_at.desc())
                .all()
            )
            if records:
                return records
        except Exception:
            pass

    return _IN_MEMORY_MODERATION_LOG
