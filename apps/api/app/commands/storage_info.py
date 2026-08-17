"""Report the configured snapshot store and object inventory for the ops gates.

Run from the repository root:

    python -m app.commands.storage_info [--storage-dir storage]

Prints the backend in use (``local`` filesystem or ``s3``), a probe
round-trip result, and the object count and total bytes currently in the
store. This supports the monitoring gate (object count and bytes by storage
class) without printing credentials: bucket names and the local root are
printed, but access keys and secret material are never echoed.
"""

import argparse
import json
from pathlib import Path

from app.storage import (
    SnapshotStoreConfigurationError,
    get_snapshot_store,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Report the configured snapshot store and its object inventory",
    )
    parser.add_argument(
        "--storage-dir",
        default="storage",
        help="local store root used when SNAPSHOT_STORAGE_BACKEND=local (default: storage)",
    )
    args = parser.parse_args()

    try:
        store = get_snapshot_store(storage_dir=Path(args.storage_dir))
    except SnapshotStoreConfigurationError as exc:
        print(json.dumps({"configured": False, "error": str(exc)}, indent=2))
        raise SystemExit(1) from exc

    label, ok, detail = store.probe()
    objects = list(store.list())
    total_bytes = sum(size for _, size in objects)

    print(
        json.dumps(
            {
                "backend": store.name,
                "probe": {"label": label, "ok": ok, "detail": detail},
                "objects": {"count": len(objects), "bytes": total_bytes},
            },
            indent=2,
        )
    )
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()