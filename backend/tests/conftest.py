"""
pytest configuration and fixtures for Django backend tests.

Provides:
- Django setup with test database
- User/Category/Product/Order factories
- Common test fixtures
- Authentication helpers
"""

from decimal import Decimal

import pytest
from api.models import Category, Order, OrderItem, Product
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

# ─────────────────────────────────────────────────────────────────────────────
# Factories
# ─────────────────────────────────────────────────────────────────────────────


class UserFactory:
    """Factory for creating test users."""

    _counter = 0

    @classmethod
    def create(
        cls,
        username=None,
        email=None,
        password="testpass123",
        *,
        is_staff=False,
        is_superuser=False,
        role="user",
        **kwargs,
    ):
        """Create a test user with profile."""
        cls._counter += 1
        if not username:
            username = f"testuser{cls._counter}"
        if not email:
            email = f"{username}@example.com"

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=is_staff,
            is_superuser=is_superuser,
            **kwargs,
        )

        # Update profile role
        if hasattr(user, "profile"):
            user.profile.role = role
            user.profile.save()

        return user

    @classmethod
    def reset(cls):
        """Reset counter for clean state."""
        cls._counter = 0


class CategoryFactory:
    """Factory for creating test categories."""

    _counter = 0

    @classmethod
    def create(cls, name=None, description="Test category description"):
        """Create a test category."""
        cls._counter += 1
        if not name:
            name = f"Category {cls._counter}"

        return Category.objects.create(
            name=name,
            description=description,
        )

    @classmethod
    def reset(cls):
        """Reset counter for clean state."""
        cls._counter = 0


class ProductFactory:
    """Factory for creating test products."""

    _counter = 0

    @classmethod
    def create(
        cls,
        title=None,
        slug=None,
        description="Test product description",
        price=Decimal("99.99"),
        category=None,
        author=None,
        status="published",
        stock=10,
    ):
        """Create a test product."""
        cls._counter += 1
        if not title:
            title = f"Product {cls._counter}"
        if not slug:
            slug = f"product-{cls._counter}"
        if not category:
            category = CategoryFactory.create()
        if not author:
            author = UserFactory.create()

        return Product.objects.create(
            title=title,
            slug=slug,
            description=description,
            price=price,
            category=category,
            author=author,
            status=status,
            stock=stock,
        )

    @classmethod
    def reset(cls):
        """Reset counter for clean state."""
        cls._counter = 0


class OrderFactory:
    """Factory for creating test orders."""

    _counter = 0

    @classmethod
    def create(
        cls,
        user=None,
        total_price=None,
        status="pending",
        products=None,
    ):
        """Create a test order."""
        cls._counter += 1
        if not user:
            user = UserFactory.create()

        if not total_price:
            total_price = Decimal("199.99")

        order = Order.objects.create(
            user=user,
            total_price=total_price,
            status=status,
        )

        # Add products if provided
        if products:
            for product, quantity in products:
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity,
                    price=product.price,
                )

        return order

    @classmethod
    def reset(cls):
        """Reset counter for clean state."""
        cls._counter = 0


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def api_client():
    """DRF API client for making requests."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a regular test user."""
    return UserFactory.create(username="testuser", role="user")


@pytest.fixture
def premium_user(db):
    """Create a premium test user."""
    return UserFactory.create(username="premiumuser", role="premium")


@pytest.fixture
def admin_user(db):
    """Create an admin test user."""
    return UserFactory.create(
        username="adminuser",
        is_staff=True,
        is_superuser=True,
        role="admin",
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """API client authenticated as regular user."""
    tokens = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.access_token}")
    return api_client, user


@pytest.fixture
def admin_client(api_client, admin_user):
    """API client authenticated as admin."""
    tokens = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.access_token}")
    return api_client, admin_user


@pytest.fixture
def category(db):
    """Create a test category."""
    return CategoryFactory.create(name="Electronics")


@pytest.fixture
def product(db, category, user):
    """Create a test product."""
    return ProductFactory.create(
        title="Test Laptop",
        slug="test-laptop",
        category=category,
        author=user,
        status="published",
    )


@pytest.fixture
def draft_product(db, category, user):
    """Create a draft product (only author can see)."""
    return ProductFactory.create(
        title="Draft Product",
        slug="draft-product",
        category=category,
        author=user,
        status="draft",
    )


@pytest.fixture
def published_products(db, category, user):
    """Create multiple published products."""
    return [
        ProductFactory.create(
            title=f"Published Product {i}",
            slug=f"published-product-{i}",
            category=category,
            author=user,
            status="published",
            price=Decimal(str(50 + i * 10)),
        )
        for i in range(5)
    ]


@pytest.fixture
def order(db, user, product):
    """Create a test order."""
    order_obj = OrderFactory.create(
        user=user,
        status="pending",
        total_price=product.price,
    )
    OrderItem.objects.create(
        order=order_obj,
        product=product,
        quantity=1,
        price=product.price,
    )
    return order_obj


@pytest.fixture(autouse=True)
def reset_factories(db):
    """Reset all factories before each test."""
    UserFactory.reset()
    CategoryFactory.reset()
    ProductFactory.reset()
    OrderFactory.reset()


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """
    Override Django's test database setup.
    Can be used to customize database creation.
    """
    with django_db_blocker.unblock():
        # Add any custom database setup here
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────


def get_user_tokens(user):
    """Get JWT tokens for a user."""
    tokens = RefreshToken.for_user(user)
    return {
        "access": str(tokens.access_token),
        "refresh": str(tokens),
    }
