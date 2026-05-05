"""Integration tests for Product API endpoints.

Tests:
- CRUD operations
- Permissions and authorization
- Filtering, searching, sorting
- Pagination
"""

from decimal import Decimal

import pytest
from api.models import Product
from rest_framework import status
from tests.conftest import (
    CategoryFactory,
    ProductFactory,
    UserFactory,
)

pytestmark = pytest.mark.integration


class TestProductListAPI:
    """Tests for GET /api/products/ endpoint."""

    def test_list_published_products_anonymous(self, api_client):
        """Anonymous users see only published products."""
        category = CategoryFactory.create()
        user = UserFactory.create()

        # Create products with different statuses
        published = ProductFactory.create(
            category=category,
            author=user,
            status="published",
        )
        draft = ProductFactory.create(
            category=category,
            author=user,
            status="draft",
        )

        response = api_client.get("/api/products/")
        assert response.status_code == status.HTTP_200_OK

        product_ids = [p["id"] for p in response.data["results"]]
        assert published.id in product_ids
        assert draft.id not in product_ids

    def test_list_products_authenticated_sees_own_drafts(self, authenticated_client):
        """Authenticated users see published + their own draft products."""
        client, user = authenticated_client
        category = CategoryFactory.create()

        # Own published
        own_published = ProductFactory.create(
            category=category,
            author=user,
            status="published",
        )
        # Own draft
        own_draft = ProductFactory.create(
            category=category,
            author=user,
            status="draft",
        )
        # Other's draft
        other_draft = ProductFactory.create(
            category=category,
            author=UserFactory.create(),
            status="draft",
        )

        response = client.get("/api/products/")
        assert response.status_code == status.HTTP_200_OK

        product_ids = [p["id"] for p in response.data["results"]]
        assert own_published.id in product_ids
        assert own_draft.id in product_ids
        assert other_draft.id not in product_ids

    def test_list_products_admin_sees_all(self, admin_client):
        """Admin users see all products regardless of status."""
        client, _admin = admin_client
        category = CategoryFactory.create()

        published = ProductFactory.create(
            category=category,
            author=UserFactory.create(),
            status="published",
        )
        draft = ProductFactory.create(
            category=category,
            author=UserFactory.create(),
            status="draft",
        )
        archived = ProductFactory.create(
            category=category,
            author=UserFactory.create(),
            status="archived",
        )

        response = client.get("/api/products/")
        assert response.status_code == status.HTTP_200_OK

        product_ids = [p["id"] for p in response.data["results"]]
        assert published.id in product_ids
        assert draft.id in product_ids
        assert archived.id in product_ids

    def test_list_products_filtering_by_category(self, api_client):
        """Test filtering products by category."""
        electronics = CategoryFactory.create(name="Electronics")
        books = CategoryFactory.create(name="Books")
        user = UserFactory.create()

        ProductFactory.create(
            category=electronics,
            author=user,
            status="published",
        )
        ProductFactory.create(
            category=books,
            author=user,
            status="published",
        )

        response = api_client.get(f"/api/products/?category={electronics.id}")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["category"] == electronics.id

    def test_list_products_filtering_by_price_range(self, api_client):
        """Test filtering products by price range."""
        category = CategoryFactory.create()
        user = UserFactory.create()

        cheap = ProductFactory.create(
            category=category,
            author=user,
            status="published",
            price=Decimal("10.00"),
        )
        expensive = ProductFactory.create(
            category=category,
            author=user,
            status="published",
            price=Decimal("100.00"),
        )

        response = api_client.get("/api/products/?min_price=50&max_price=150")
        assert response.status_code == status.HTTP_200_OK

        product_ids = [p["id"] for p in response.data["results"]]
        assert cheap.id not in product_ids
        assert expensive.id in product_ids

    def test_list_products_search(self, api_client):
        """Test searching products by title and description."""
        category = CategoryFactory.create()
        user = UserFactory.create()

        matching = ProductFactory.create(
            title="iPhone 15 Pro",
            description="Apple smartphone",
            category=category,
            author=user,
            status="published",
        )
        non_matching = ProductFactory.create(
            title="Samsung Galaxy",
            description="Android phone",
            category=category,
            author=user,
            status="published",
        )

        response = api_client.get("/api/products/?search=iPhone")
        assert response.status_code == status.HTTP_200_OK

        product_ids = [p["id"] for p in response.data["results"]]
        assert matching.id in product_ids
        assert non_matching.id not in product_ids

    def test_list_products_sorting_by_price(self, api_client):
        """Test sorting products by price."""
        category = CategoryFactory.create()
        user = UserFactory.create()

        ProductFactory.create(
            title="Expensive",
            category=category,
            author=user,
            status="published",
            price=Decimal("100.00"),
        )
        ProductFactory.create(
            title="Cheap",
            category=category,
            author=user,
            status="published",
            price=Decimal("10.00"),
        )

        response = api_client.get("/api/products/?ordering=price")
        assert response.status_code == status.HTTP_200_OK
        prices = [Decimal(p["price"]) for p in response.data["results"]]
        assert prices == sorted(prices)

    def test_list_products_pagination(self, api_client):
        """Test product list pagination."""
        category = CategoryFactory.create()
        user = UserFactory.create()

        for i in range(15):
            ProductFactory.create(
                title=f"Product {i}",
                slug=f"product-{i}",
                category=category,
                author=user,
                status="published",
            )

        response = api_client.get("/api/products/?page=1")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 10  # noqa: PLR2004
        assert response.data["count"] == 15  # noqa: PLR2004

        response = api_client.get("/api/products/?page=2")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 5  # noqa: PLR2004


class TestProductDetailAPI:
    """Tests for GET /api/products/{slug}/ endpoint."""

    def test_retrieve_published_product_anonymous(self, api_client):
        """Anonymous users can retrieve published products."""
        product = ProductFactory.create(status="published")

        response = api_client.get(f"/api/products/{product.slug}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == product.id
        assert response.data["title"] == product.title

    def test_retrieve_draft_product_forbidden_for_others(self, api_client):
        """Draft products are not visible to other users."""
        product = ProductFactory.create(status="draft")

        response = api_client.get(f"/api/products/{product.slug}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_draft_product_allowed_for_author(self, authenticated_client):
        """Author can retrieve their own draft products."""
        client, user = authenticated_client
        product = ProductFactory.create(author=user, status="draft")

        response = client.get(f"/api/products/{product.slug}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == product.id

    def test_retrieve_nonexistent_product(self, api_client):
        """Retrieving nonexistent product returns 404."""
        response = api_client.get("/api/products/nonexistent-product/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestProductCreateAPI:
    """Tests for POST /api/products/ endpoint."""

    def test_create_product_requires_authentication(self, api_client):
        """Anonymous users cannot create products."""
        response = api_client.post(
            "/api/products/",
            {
                "title": "New Product",
                "slug": "new-product",
                "description": "Test",
                "price": "99.99",
                "category": 1,
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_product_authenticated(self, authenticated_client):
        """Authenticated users can create products."""
        client, user = authenticated_client
        category = CategoryFactory.create()

        response = client.post(
            "/api/products/",
            {
                "title": "New Laptop",
                "slug": "new-laptop",
                "description": "Gaming laptop",
                "price": "1499.99",
                "category": category.id,
                "stock": 5,
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "New Laptop"
        assert response.data["author"]["username"] == user.username
        assert response.data["status"] == "draft"

    def test_create_product_missing_required_fields(self, authenticated_client):
        """Creating product without required fields fails."""
        client, _ = authenticated_client

        response = client.post(
            "/api/products/",
            {
                "title": "Incomplete Product",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_product_invalid_price(self, authenticated_client):
        """Creating product with invalid price fails."""
        client, _ = authenticated_client
        category = CategoryFactory.create()

        response = client.post(
            "/api/products/",
            {
                "title": "Product",
                "slug": "product",
                "description": "Test",
                "price": "invalid",
                "category": category.id,
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestProductUpdateAPI:
    """Tests for PUT/PATCH /api/products/{slug}/ endpoint."""

    def test_update_own_product(self, authenticated_client):
        """Users can update their own products."""
        client, user = authenticated_client
        product = ProductFactory.create(author=user)

        response = client.patch(
            f"/api/products/{product.slug}/",
            {"title": "Updated Title"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Title"

    def test_update_others_product_forbidden(self, authenticated_client):
        """Users cannot update products they don't own."""
        client, _ = authenticated_client
        other_user = UserFactory.create()
        product = ProductFactory.create(author=other_user)

        response = client.patch(
            f"/api/products/{product.slug}/",
            {"title": "Hacked Title"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_update_any_product(self, admin_client):
        """Admins can update any product."""
        client, _ = admin_client
        user = UserFactory.create()
        product = ProductFactory.create(author=user)

        response = client.patch(
            f"/api/products/{product.slug}/",
            {"title": "Admin Updated"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Admin Updated"


class TestProductDeleteAPI:
    """Tests for DELETE /api/products/{slug}/ endpoint."""

    def test_delete_own_product(self, authenticated_client):
        """Users can delete their own products."""
        client, user = authenticated_client
        product = ProductFactory.create(author=user)
        product_id = product.id

        response = client.delete(f"/api/products/{product.slug}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Product.objects.filter(id=product_id).exists()

    def test_delete_others_product_forbidden(self, authenticated_client):
        """Users cannot delete products they don't own."""
        client, _ = authenticated_client
        other_user = UserFactory.create()
        product = ProductFactory.create(author=other_user)

        response = client.delete(f"/api/products/{product.slug}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Product.objects.filter(id=product.id).exists()

    def test_delete_nonexistent_product(self, authenticated_client):
        """Deleting nonexistent product returns 404."""
        client, _ = authenticated_client

        response = client.delete("/api/products/nonexistent/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
