"""Immutable snapshot object-storage abstraction.

Operators historically wrote raw snapshots into a local ``storage/snapshots``
directory. The operations release gates require private object storage so the
immutable raw bytes behind ``SourceSnapshot.object_storage_key`` survive a
database restore. This module exposes a small store interface with a local
filesystem backend (default: tests, disposable runs, local operators) and an
S3-compatible backend that activates only when explicitly configured. The
operators and the ``SourceSnapshot`` rows never see which backend is in use,
and keys are always the same relative ``snapshots/<sha256>.<ext>`` form.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from collections.abc import Iterator
from pathlib import Path
from typing import Any

SNAPSHOT_KEYS_PREFIX = "snapshots"


class SnapshotStoreConfigurationError(RuntimeError):
    pass


def snapshot_key(checksum: str, extension: str) -> str:
    """Return the storage key for an immutable raw snapshot.

    The extension is taken verbatim (``.html``, ``.pdf``, ``.json``) so the key
    matches the checksummed raw bytes regardless of backend.
    """
    extension = extension if extension.startswith(".") else f".{extension}"
    return f"{SNAPSHOT_KEYS_PREFIX}/{checksum}{extension}"


class SnapshotStore(ABC):
    name: str

    @abstractmethod
    def put(self, key: str, raw: bytes) -> None:
        """Write the raw bytes at ``key``, overwriting any existing object."""

    @abstractmethod
    def get(self, key: str) -> bytes | None:
        """Return the raw bytes at ``key``, or None when absent."""

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Return True when an object exists at ``key``."""

    @abstractmethod
    def list(self) -> Iterator[tuple[str, int]]:
        """Yield ``(key, size_bytes)`` for every object in the store."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove the object at ``key``; absent objects are a no-op."""

    def probe(self) -> tuple[str, bool, str]:
        """Write, read back, and delete a probe object; returns ``(label, ok, detail)``."""
        key = "probe/ops-release-gate"
        raw = b"ops-release-gate-probe"
        try:
            self.put(key, raw)
            if self.get(key) != raw:
                return (self.name, False, "probe round-trip mismatch")
            self.delete(key)
            return (self.name, True, "probe round-trip ok")
        except Exception as exc:  # noqa: BLE001 - the caller reports the detail
            return (self.name, False, str(exc))


class LocalSnapshotStore(SnapshotStore):
    def __init__(self, root: Path) -> None:
        self.name = "local"
        self._root = root.resolve()

    def _path(self, key: str) -> Path:
        path = (self._root / key).resolve()
        if self._root != path and self._root not in path.parents:
            raise ValueError("snapshot key escapes the local store root")
        return path

    def put(self, key: str, raw: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)

    def get(self, key: str) -> bytes | None:
        path = self._path(key)
        return path.read_bytes() if path.exists() else None

    def exists(self, key: str) -> bool:
        return self._path(key).exists()

    def list(self) -> Iterator[tuple[str, int]]:
        for path in self._root.rglob("*"):
            if path.is_file():
                yield (path.relative_to(self._root).as_posix(), path.stat().st_size)

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)


class S3SnapshotStore(SnapshotStore):
    """S3-compatible backend loaded lazily so the base install needs no SDK."""

    def __init__(
        self,
        *,
        bucket: str,
        endpoint_url: str | None,
        region: str,
    ) -> None:
        self.name = "s3"
        self._bucket = bucket
        self._endpoint_url = endpoint_url
        self._region = region
        self._client = self._load_client(endpoint_url, region)

    @staticmethod
    def _load_client(endpoint_url: str | None, region: str) -> Any:
        try:
            import boto3  # type: ignore
        except ImportError as exc:  # pragma: no cover - environment dependent
            raise SnapshotStoreConfigurationError(
                "S3 snapshot storage requires the optional 's3' dependency group "
                "(pip install -e '.[s3]') or SNAPSHOT_STORAGE_BACKEND=local"
            ) from exc
        return boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url,
        )

    def put(self, key: str, raw: bytes) -> None:
        self._client.put_object(Bucket=self._bucket, Key=key, Body=raw)

    def get(self, key: str) -> bytes | None:
        try:
            response = self._client.get_object(Bucket=self._bucket, Key=key)
            body = response["Body"].read()
            return body if isinstance(body, bytes) else bytes(body)
        except Exception as exc:  # noqa: BLE001 - inspect the SDK error below
            if self._error_code(exc) in {"NoSuchKey", "404", "NotFound"}:
                return None
            raise

    def exists(self, key: str) -> bool:
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
            return True
        except Exception as exc:  # noqa: BLE001 - inspect the SDK error below
            if self._error_code(exc) in {"404", "NoSuchKey", "NotFound"}:
                return False
            raise

    def list(self) -> Iterator[tuple[str, int]]:
        paginator = self._client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self._bucket):
            for entry in page.get("Contents", []):
                yield (entry["Key"], entry["Size"])

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)

    @staticmethod
    def _error_code(exc: Exception) -> str:
        response = getattr(exc, "response", None)
        if isinstance(response, dict):
            error = response.get("Error") or {}
            return str(error.get("Code", ""))
        return ""


def get_snapshot_store(*, storage_dir: Path) -> SnapshotStore:
    """Resolve the configured snapshot store for an operator run.

    ``SNAPSHOT_STORAGE_BACKEND`` selects the backend: ``local`` (default) or
    ``s3``. For ``s3``, ``S3_BUCKET`` is required and ``S3_ENDPOINT_URL`` and
    ``S3_REGION`` override the defaults; credentials come from the standard AWS
    environment (``AWS_ACCESS_KEY_ID``/``AWS_SECRET_ACCESS_KEY``).
    ``storage_dir`` is used only by the local backend.
    """
    backend = os.getenv("SNAPSHOT_STORAGE_BACKEND", "local").strip().lower()
    if backend == "s3":
        bucket = os.getenv("S3_BUCKET", "").strip()
        if not bucket:
            raise SnapshotStoreConfigurationError(
                "S3_BUCKET must be set when SNAPSHOT_STORAGE_BACKEND=s3"
            )
        return S3SnapshotStore(
            bucket=bucket,
            endpoint_url=os.getenv("S3_ENDPOINT_URL") or None,
            region=os.getenv("S3_REGION", "us-east-1").strip() or "us-east-1",
        )
    if backend != "local":
        raise SnapshotStoreConfigurationError(
            f"unknown SNAPSHOT_STORAGE_BACKEND {backend!r}; choose 'local' or 's3'"
        )
    return LocalSnapshotStore(storage_dir)
