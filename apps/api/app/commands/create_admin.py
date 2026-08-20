import argparse
import getpass
import uuid
from collections.abc import Sequence

from app.auth import hash_password
from app.db import get_session_factory
from app.models.community import ModerationAuditRecord, StaffAccount


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Create the first authenticated platform admin")
    parser.add_argument("--email", required=True, help="Administrator email address")
    parser.add_argument("--display-name", required=True, help="Internal staff display name")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    email = args.email.strip().casefold()
    if "@" not in email:
        raise SystemExit("A valid email address is required")
    password = getpass.getpass("New admin password: ")
    confirmation = getpass.getpass("Confirm admin password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match")
    try:
        password_hash = hash_password(password)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    with get_session_factory()() as db:
        if db.query(StaffAccount).filter(StaffAccount.email == email).first() is not None:
            raise SystemExit("A staff account with that email already exists")
        admin = StaffAccount(
            id=uuid.uuid4(),
            email=email,
            display_name=args.display_name.strip(),
            role="admin",
            password_hash=password_hash,
            must_change_password=False,
        )
        db.add(admin)
        db.flush()
        db.add(
            ModerationAuditRecord(
                moderator_id="System bootstrap",
                staff_account_id=admin.id,
                action="admin_created",
                target_type="staff_account",
                target_id=str(admin.id),
                reason="Initial administrator created from the trusted server command",
                previous_state=None,
                new_state={"role": "admin", "is_active": True},
            )
        )
        db.commit()
    print(f"Created admin account for {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
