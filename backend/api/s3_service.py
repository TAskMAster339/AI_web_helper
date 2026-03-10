import logging
import uuid

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_client():
    """Return a boto3 S3 client pointed at MinIO."""
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME or None,
        config=Config(signature_version="s3v4"),
    )


def ensure_bucket_exists(bucket: str | None = None) -> None:
    """Create the bucket if it doesn't exist yet."""
    bucket = bucket or settings.AWS_STORAGE_BUCKET_NAME
    client = _get_client()
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError:
        client.create_bucket(Bucket=bucket)
        logger.info("Created S3 bucket: %s", bucket)


def upload_file(file_obj, content_type: str, original_filename: str) -> str:
    """
    Upload a file-like object to S3/MinIO.
    Returns the S3 object key.
    """
    ensure_bucket_exists()
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    key = f"products/{uuid.uuid4()}.{ext}"
    client = _get_client()
    client.upload_fileobj(
        file_obj,
        settings.AWS_STORAGE_BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    logger.info("Uploaded file to S3: %s", key)
    return key


def generate_presigned_url(key: str, expires_in: int = 3600) -> str:
    """
    Generate a pre-signed GET URL for a private object.
    Uses the public URL (accessible from browser) if configured differently
    from the internal Docker endpoint.
    """
    # Build a client that signs URLs using the public-facing endpoint
    public_url = getattr(settings, "AWS_S3_PUBLIC_URL", settings.AWS_S3_ENDPOINT_URL)
    client = boto3.client(
        "s3",
        endpoint_url=public_url,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME or None,
        config=Config(signature_version="s3v4"),
    )
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_STORAGE_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )


def delete_file(key: str) -> None:
    """Delete an object from S3/MinIO."""
    client = _get_client()
    try:
        client.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
        logger.info("Deleted S3 object: %s", key)
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Failed to delete S3 object %s: %s", key, exc)
        raise
