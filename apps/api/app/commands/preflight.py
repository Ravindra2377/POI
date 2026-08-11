from app.db import check_database_readiness


def main() -> None:
    version = check_database_readiness()
    print(f"Database ready; PostGIS {version}")


if __name__ == "__main__":
    main()
