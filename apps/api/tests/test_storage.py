from pathlib import Path

import pytest

from app.storage import (
    LocalSnapshotStore,
    S3SnapshotStore,
    SnapshotStoreConfigurationError,
    get_snapshot_store,
    snapshot_key,
)


def test_snapshot_key_matches_checksummed_extension() -> None:
    assert snapshot_key("abc123", ".json") == "snapshots/abc123.json"
    assert snapshot_key("abc123", "html") == "snapshots/abc123.html"
    assert snapshot_key("abc123", ".pdf") == "snapshots/abc123.pdf"


def test_local_store_put_get_exists_list_and_probe(tmp_path: Path) -> None:
    store = LocalSnapshotStore(tmp_path)
    key = snapshot_key("deadbeef", ".json")
    assert store.exists(key) is False
    assert store.get(key) is None

    store.put(key, b'{"raw": true}')
    assert store.exists(key) is True
    assert store.get(key) == b'{"raw": true}'
    assert (tmp_path / "snapshots" / "deadbeef.json").read_bytes() == b'{"raw": true}'

    store.put(key, b"overwritten")
    assert store.get(key) == b"overwritten"

    assert list(store.list()) == [(key, len(b"overwritten"))]
    label, ok, _ = store.probe()
    assert label == "local"
    assert ok is True


def test_local_store_rejects_keys_escaping_the_root(tmp_path: Path) -> None:
    store = LocalSnapshotStore(tmp_path)
    with pytest.raises(ValueError):
        store.put("../escape.bin", b"x")


def test_local_store_overwrites_immutable_key_consistently(tmp_path: Path) -> None:
    store = LocalSnapshotStore(tmp_path)
    raw = b"snapshot-bytes"
    store.put(snapshot_key("abcd", ".html"), raw)
    assert store.get(snapshot_key("abcd", ".html")) == raw


def test_factory_defaults_to_local_backend(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SNAPSHOT_STORAGE_BACKEND", raising=False)
    store = get_snapshot_store(storage_dir=tmp_path)
    assert isinstance(store, LocalSnapshotStore)
    assert store.name == "local"


def test_factory_local_backend_ignores_missing_s3_config(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("SNAPSHOT_STORAGE_BACKEND", "local")
    monkeypatch.delenv("S3_BUCKET", raising=False)
    store = get_snapshot_store(storage_dir=tmp_path)
    assert isinstance(store, LocalSnapshotStore)


def test_factory_s3_requires_a_bucket(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("SNAPSHOT_STORAGE_BACKEND", "s3")
    monkeypatch.delenv("S3_BUCKET", raising=False)
    with pytest.raises(SnapshotStoreConfigurationError, match="S3_BUCKET"):
        get_snapshot_store(storage_dir=tmp_path)


def test_factory_rejects_unknown_backend(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SNAPSHOT_STORAGE_BACKEND", "ftp")
    with pytest.raises(SnapshotStoreConfigurationError, match="unknown"):
        get_snapshot_store(storage_dir=tmp_path)


def test_s3_store_reports_config_error_when_sdk_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def _unavailable(endpoint_url: str | None, region: str) -> None:
        raise SnapshotStoreConfigurationError(
            "S3 snapshot storage requires the optional 's3' dependency group"
        )

    monkeypatch.setattr(S3SnapshotStore, "_load_client", staticmethod(_unavailable))
    with pytest.raises(SnapshotStoreConfigurationError, match="optional 's3'"):
        S3SnapshotStore(bucket="test-bucket", endpoint_url=None, region="us-east-1")