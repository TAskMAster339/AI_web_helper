import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

MIN_USERNAME_LENGTH = 3
MAX_USERNAME_LENGTH = 30
MAX_PRICE = 999999999
MAX_STOCK = 999999


def validate_no_special_chars(value):
    """Validate that value contains no dangerous special characters."""
    if re.search(r'[<>"\';\\]', value):
        raise ValidationError(
            _("Value contains invalid special characters."),
            code="invalid_special_chars",
        )


def validate_slug_format(value):
    """Validate that value is a valid slug format."""
    if not re.match(r"^[a-zA-Z0-9_-]+$", value):
        raise ValidationError(
            _("Slug can only contain letters, numbers, hyphens and underscores."),
            code="invalid_slug",
        )


def validate_username(value):
    """Validate username format."""
    if len(value) < MIN_USERNAME_LENGTH:
        raise ValidationError(
            _("Username must be at least 3 characters long."),
            code="username_too_short",
        )
    if len(value) > MAX_USERNAME_LENGTH:
        raise ValidationError(
            _("Username must be at most 30 characters long."),
            code="username_too_long",
        )
    if not re.match(r"^[a-zA-Z0-9_-]+$", value):
        raise ValidationError(
            _("Username can only contain letters, numbers, hyphens and underscores."),
            code="invalid_username",
        )


def validate_price(value):
    """Validate product price."""
    if value <= 0:
        raise ValidationError(
            _("Price must be greater than zero."),
            code="invalid_price",
        )
    if value > MAX_PRICE:
        raise ValidationError(
            _("Price is too high."),
            code="price_too_high",
        )


def validate_stock(value):
    """Validate product stock quantity."""
    if value < 0:
        raise ValidationError(
            _("Stock cannot be negative."),
            code="invalid_stock",
        )
    if value > MAX_STOCK:
        raise ValidationError(
            _("Stock quantity is too high."),
            code="stock_too_high",
        )
