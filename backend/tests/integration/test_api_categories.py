"""Integration tests for Category API endpoints.

Tests:
- List categories
- Create/Update/Delete categories
- Filtering and searching
"""

import pytest
from api.models import Category
from rest_framework import status
from tests.conftest import CategoryFactory, ProductFactory

pytestmark = pytest.mark.integration


class TestCategoryListAPI:
    """Tests for GET /api/categories/ endpoint."""

    def test_list_categories_anonymous(self, api_client):
        """Anonymous users can list categories."""
        CategoryFactory.create(name="Electronics")
        CategoryFactory.create(name="Books")

        response = api_client.get("/api/categories/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2  # noqa: PLR2004

    def test_list_categories_includes_product_count(self, api_client):
        """Category list includes product count."""

        category = CategoryFactory.create()
        ProductFactory.create(category=category)
        ProductFactory.create(category=category)

        response = api_client.get("/api/categories/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"][0]["products_count"] == 2  # noqa: PLR2004

    def test_search_categories_by_name(self, api_client):
        """Test searching categories by name."""
        CategoryFactory.create(name="Electronics")
        CategoryFactory.create(name="Books")

        response = api_client.get("/api/categories/?search=Books")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Books"

    def test_categories_ordering(self, api_client):
        """Test categories are ordered by name."""
        CategoryFactory.create(name="Zebra")
        CategoryFactory.create(name="Apple")

        response = api_client.get("/api/categories/")

        assert response.status_code == status.HTTP_200_OK
        names = [c["name"] for c in response.data["results"]]
        assert names == sorted(names)


class TestCategoryDetailAPI:
    """Tests for GET /api/categories/{id}/ endpoint."""

    def test_retrieve_category(self, api_client):
        """Test retrieving category details."""
        category = CategoryFactory.create(name="Electronics")

        response = api_client.get(f"/api/categories/{category.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Electronics"

    def test_retrieve_nonexistent_category(self, api_client):
        """Test retrieving nonexistent category returns 404."""
        response = api_client.get("/api/categories/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestCategoryCreateAPI:
    """Tests for POST /api/categories/ endpoint."""

    def test_create_category_requires_authentication(self, api_client):
        """Anonymous users cannot create categories."""
        response = api_client.post(
            "/api/categories/",
            {
                "name": "New Category",
                "description": "Test",
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_category_authenticated(self, authenticated_client):
        """Authenticated users can create categories."""
        client, _ = authenticated_client

        response = client.post(
            "/api/categories/",
            {
                "name": "New Category",
                "description": "Test description",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Category"

    def test_create_duplicate_category(self, authenticated_client):
        """Creating duplicate category fails."""
        client, _ = authenticated_client
        CategoryFactory.create(name="Existing")

        response = client.post(
            "/api/categories/",
            {
                "name": "Existing",
                "description": "Duplicate",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestCategoryUpdateAPI:
    """Tests for PUT/PATCH /api/categories/{id}/ endpoint."""

    def test_update_category(self, authenticated_client):
        """Test updating category."""
        client, _ = authenticated_client
        category = CategoryFactory.create()

        response = client.patch(
            f"/api/categories/{category.id}/",
            {"description": "Updated description"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["description"] == "Updated description"

    def test_update_nonexistent_category(self, authenticated_client):
        """Updating nonexistent category returns 404."""
        client, _ = authenticated_client

        response = client.patch(
            "/api/categories/99999/",
            {"name": "Fake"},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestCategoryDeleteAPI:
    """Tests for DELETE /api/categories/{id}/ endpoint."""

    def test_delete_category(self, authenticated_client):
        """Test deleting category."""
        client, _ = authenticated_client
        category = CategoryFactory.create()
        category_id = category.id

        response = client.delete(f"/api/categories/{category.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Category.objects.filter(id=category_id).exists()

    def test_delete_nonexistent_category(self, authenticated_client):
        """Deleting nonexistent category returns 404."""
        client, _ = authenticated_client

        response = client.delete("/api/categories/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
