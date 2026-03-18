"""
Integration tests for authentication endpoints.

Tests:
- User registration
- User login
- Token refresh
- Logout and token blacklist
"""

from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone as dj_timezone
from freezegun import freeze_time
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from tests.conftest import UserFactory

pytestmark = pytest.mark.integration


class TestUserRegistration:
    """Tests for user registration endpoint."""

    def test_register_new_user(self, api_client):
        """Test successful user registration."""
        response = api_client.post(
            "/api/users/register/",
            {
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "SecurePass123!",
                "password2": "SecurePass123!",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        # RegisterView returns only a detail message; user is created inactive.
        assert "detail" in response.data
        assert User.objects.filter(username="newuser").exists()

    def test_register_duplicate_username(self, api_client):
        """Test registration with duplicate username fails."""
        UserFactory.create(username="taken")

        response = api_client.post(
            "/api/users/register/",
            {
                "username": "taken",
                "email": "another@example.com",
                "password": "SecurePass123!",
                "password2": "SecurePass123!",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_password_mismatch(self, api_client):
        """Test registration with mismatched passwords fails."""
        response = api_client.post(
            "/api/users/register/",
            {
                "username": "newuser",
                "email": "user@example.com",
                "password": "SecurePass123!",
                "password2": "DifferentPass123!",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_invalid_email(self, api_client):
        """Test registration with invalid email fails."""
        response = api_client.post(
            "/api/users/register/",
            {
                "username": "newuser",
                "email": "not-an-email",
                "password": "SecurePass123!",
                "password2": "SecurePass123!",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestUserLogin:
    """Tests for user login endpoint."""

    def test_login_success(self, api_client):
        """Test successful login returns access token and sets refresh cookie."""
        UserFactory.create(username="testuser", password="testpass123")

        response = api_client.post(
            "/api/users/login/",
            {
                "login": "testuser",
                "password": "testpass123",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "user" in response.data
        # Refresh token is returned via HttpOnly cookie
        assert "refresh_token" in response.cookies

    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials fails."""
        UserFactory.create(username="testuser", password="testpass123")

        response = api_client.post(
            "/api/users/login/",
            {
                "login": "testuser",
                "password": "wrongpassword",
            },
            format="json",
        )

        # LoginView returns serializer errors -> 400
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_nonexistent_user(self, api_client):
        """Test login with nonexistent user fails."""
        response = api_client.post(
            "/api/users/login/",
            {
                "login": "nonexistent",
                "password": "anypassword",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_fields(self, api_client):
        """Test login with missing fields fails."""
        response = api_client.post(
            "/api/users/login/",
            {
                "login": "testuser",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestTokenRefresh:
    """Tests for token refresh endpoint."""

    def test_refresh_token_success(self, api_client):
        """Test successful token refresh (refresh token is read from cookie)."""
        user = UserFactory.create()
        refresh = RefreshToken.for_user(user)

        # TokenRefreshView reads refresh token from cookie "refresh_token".
        api_client.cookies["refresh_token"] = str(refresh)

        response = api_client.post("/api/users/token/refresh/", {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_refresh_token_invalid(self, api_client):
        """Test refresh with invalid token fails."""
        response = api_client.post(
            "/api/users/token/refresh/",
            {
                "refresh": "invalid-token",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token_missing(self, api_client):
        """Test refresh without cookie fails."""
        response = api_client.post("/api/users/token/refresh/", {}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestUserLogout:
    """Tests for user logout endpoint."""

    def test_logout_success(self, authenticated_client):
        """Test successful logout."""
        client, _user = authenticated_client

        response = client.post("/api/users/logout/")

        assert response.status_code == status.HTTP_200_OK


class TestTokenProtectedEndpoint:
    """Tests for protected endpoints requiring authentication."""

    def test_access_protected_endpoint_without_token(self, api_client):
        """Test accessing protected endpoint without token fails."""
        response = api_client.get("/api/users/me/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_access_protected_endpoint_with_valid_token(self, authenticated_client):
        """Test accessing protected endpoint with valid token."""
        client, user = authenticated_client

        response = client.get("/api/users/me/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == user.username

    def test_access_protected_endpoint_with_invalid_token(self, api_client):
        """Test accessing protected endpoint with invalid token fails."""
        api_client.credentials(HTTP_AUTHORIZATION="Bearer invalid-token")

        response = api_client.get("/api/users/me/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_access_protected_endpoint_with_expired_token(self, api_client):
        """Test accessing protected endpoint with expired token fails."""
        user = UserFactory.create()
        tokens = RefreshToken.for_user(user)

        # Freeze time *after* expiry. Keep it deterministic for freezegun.
        future = dj_timezone.now() + timedelta(minutes=10)
        with freeze_time(future):
            api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.access_token}")
            response = api_client.get("/api/users/me/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
