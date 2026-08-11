from app.db import get_session_factory
from app.seeds import seed_stage1


def main() -> None:
    with get_session_factory()() as session, session.begin():
        result = seed_stage1(session)
    print(result.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
