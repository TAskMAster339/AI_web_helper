import io

import api.s3_service as s3
import pytest

pytestmark = pytest.mark.unit


class _DummyClient:
    def __init__(self):
        self.calls = []

    def head_bucket(self, **kwargs):
        self.calls.append(("head_bucket", kwargs))

    def create_bucket(self, **kwargs):
        self.calls.append(("create_bucket", kwargs))

    def upload_fileobj(self, *args, **kwargs):
        self.calls.append(("upload_fileobj", args, kwargs))

    def generate_presigned_url(self, *args, **kwargs):
        self.calls.append(("generate_presigned_url", args, kwargs))
        return "https://example.test/presigned"

    def delete_object(self, **kwargs):
        self.calls.append(("delete_object", kwargs))


def test_ensure_bucket_exists_creates_on_head_error(monkeypatch, settings):
    settings.AWS_STORAGE_BUCKET_NAME = "bucket"
    settings.AWS_S3_ENDPOINT_URL = "http://minio"
    settings.AWS_S3_PUBLIC_URL = "http://public"
    settings.AWS_ACCESS_KEY_ID = "k"
    settings.AWS_SECRET_ACCESS_KEY = "s"
    settings.AWS_S3_REGION_NAME = ""

    client = _DummyClient()

    class DummyClientError(Exception):
        pass

    def head_bucket(**kwargs):
        raise s3.ClientError({"Error": {}}, "HeadBucket")

    client.head_bucket = head_bucket

    monkeypatch.setattr(s3, "_get_client", lambda: client)

    s3.ensure_bucket_exists()
    assert any(c[0] == "create_bucket" for c in client.calls)


def test_upload_file_calls_upload_fileobj(monkeypatch, settings):
    settings.AWS_STORAGE_BUCKET_NAME = "bucket"
    settings.AWS_S3_ENDPOINT_URL = "http://minio"
    settings.AWS_ACCESS_KEY_ID = "k"
    settings.AWS_SECRET_ACCESS_KEY = "s"
    settings.AWS_S3_REGION_NAME = ""

    client = _DummyClient()
    monkeypatch.setattr(s3, "_get_client", lambda: client)
    monkeypatch.setattr(s3, "ensure_bucket_exists", lambda *a, **k: None)

    key = s3.upload_file(io.BytesIO(b"data"), "text/plain", "a.txt")
    assert key.startswith("products/")
    assert any(c[0] == "upload_fileobj" for c in client.calls)


def test_generate_presigned_url_uses_public_endpoint(monkeypatch, settings):
    settings.AWS_STORAGE_BUCKET_NAME = "bucket"
    settings.AWS_S3_ENDPOINT_URL = "http://internal"
    settings.AWS_S3_PUBLIC_URL = "http://public"
    settings.AWS_ACCESS_KEY_ID = "k"
    settings.AWS_SECRET_ACCESS_KEY = "s"
    settings.AWS_S3_REGION_NAME = ""

    created = []

    def fake_boto3_client(service, **kwargs):
        assert service == "s3"
        created.append(kwargs.get("endpoint_url"))
        return _DummyClient()

    monkeypatch.setattr(s3.boto3, "client", fake_boto3_client)

    url = s3.generate_presigned_url("products/x.png")
    assert url.startswith("https://")
    assert created[-1] == "http://public"


def test_delete_file_calls_delete_object(monkeypatch, settings):
    settings.AWS_STORAGE_BUCKET_NAME = "bucket"
    settings.AWS_S3_ENDPOINT_URL = "http://minio"
    settings.AWS_ACCESS_KEY_ID = "k"
    settings.AWS_SECRET_ACCESS_KEY = "s"
    settings.AWS_S3_REGION_NAME = ""

    client = _DummyClient()
    monkeypatch.setattr(s3, "_get_client", lambda: client)

    s3.delete_file("products/a.bin")
    assert any(c[0] == "delete_object" for c in client.calls)
