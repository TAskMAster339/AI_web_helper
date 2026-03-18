"""End-to-end workflow tests.

These tests cover a full happy-path user workflow (auth -> CRUD) against the
real Django app stack (DB, serializers, permissions) but still run fully
in-process using DRF's APIClient.

Marked as `e2e` per TESTING_STRATEGY.md.
"""

import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from tests.conftest import CategoryFactory, UserFactory

pytestmark = pytest.mark.e2e


def _register(api_client, username: str, email: str, password: str):
    return api_client.post(
        "/api/users/register/",
        {
            "username": username,
            "email": email,
            "password": password,
            "password2": password,
        },
        format="json",
    )


def _login(api_client, login: str, password: str):
    return api_client.post(
        "/api/users/login/",
        {"login": login, "password": password},
        format="json",
    )


@pytest.mark.django_db
def test_e2e_auth_workflow_register_login_me_refresh_logout(api_client):
    """Register -> login -> /me -> refresh -> logout.

    Note: registration creates an inactive user in this project.
    For E2E we still verify that the endpoint contract works and that
    login works for an active user.
    """

    username = "e2e_user"
    email = "e2e_user@example.com"
    password = "e2ePass123!"

    # Register (contract: 201 + detail)
    resp = _register(api_client, username, email, password)
    assert resp.status_code == status.HTTP_201_CREATED
    assert "detail" in resp.data

    # Login requires an active user in this app; activate directly at DB layer.
    user = User.objects.get(username=username)
    user.is_active = True
    user.save(update_fields=["is_active"])

    resp = _login(api_client, username, password)
    assert resp.status_code == status.HTTP_200_OK
    assert "access" in resp.data
    assert "user" in resp.data
    assert "refresh_token" in resp.cookies

    # /me with access token
    access = resp.data["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    me = api_client.get("/api/users/me/")
    assert me.status_code == status.HTTP_200_OK
    assert me.data["username"] == username

    # Refresh (server reads refresh from cookie). Keep cookie, drop auth header.
    api_client.credentials()
    refresh = api_client.post("/api/users/token/refresh/", {}, format="json")
    assert refresh.status_code == status.HTTP_200_OK
    assert "access" in refresh.data

    # Logout requires authentication
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.data['access']}")
    logout = api_client.post("/api/users/logout/")
    assert logout.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_e2e_product_workflow_create_list_detail_update_delete(api_client):
    """Login -> category -> product create/list/detail/update/delete."""

    # Use admin so we can always see/delete any status in queryset.
    user = UserFactory.create(
        username="e2e_admin",
        password="testpass123",
        is_staff=True,
        is_superuser=True,
        role="admin",
    )
    tokens = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.access_token}")

    category = CategoryFactory.create(name="E2E Category")

    create = api_client.post(
        "/api/products/",
        {
            "title": "E2E Product",
            "description": "Created in e2e test",
            "price": "123.45",
            "status": "draft",
            "stock": 2,
            "category": category.id,
        },
        format="json",
    )
    assert create.status_code == status.HTTP_201_CREATED

    slug = create.data["slug"]
    assert slug

    lst = api_client.get("/api/products/")
    assert lst.status_code == status.HTTP_200_OK
    assert any(p["slug"] == slug for p in lst.data["results"])

    detail = api_client.get(f"/api/products/{slug}/")
    assert detail.status_code == status.HTTP_200_OK

    upd = api_client.patch(
        f"/api/products/{slug}/",
        {"title": "E2E Product Updated", "status": "published"},
        format="json",
    )
    assert upd.status_code == status.HTTP_200_OK

    # Title change regenerates slug in this app.
    new_slug = upd.data["slug"]
    assert new_slug

    delete = api_client.delete(f"/api/products/{new_slug}/")
    assert delete.status_code == status.HTTP_204_NO_CONTENT

    after = api_client.get(f"/api/products/{new_slug}/")
    assert after.status_code == status.HTTP_404_NOT_FOUND
