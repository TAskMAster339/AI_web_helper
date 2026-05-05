from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView

from . import views

urlpatterns = [
    # Auth endpoints
    path("activate/<str:token>/", views.ActivateAccountView.as_view(), name="activate"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.UserDetailView.as_view(), name="user_detail"),
    path("me/avatar/", views.AvatarUploadView.as_view(), name="user_avatar"),
    # JWT token endpoints
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", views.TokenRefreshView.as_view(), name="token_refresh"),
    # Password reset endpoints
    path("password-reset/", views.PasswordResetView.as_view(), name="password_reset"),
    path(
        "password-reset-confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),  # Admin endpoints
    path("admin/users/", views.ManageUsersView.as_view(), name="admin_users"),
    path(
        "admin/users/<int:user_id>/role/",
        views.UpdateUserRoleView.as_view(),
        name="admin_update_role",
    ),
    # Public user profile (view only; admin can also PATCH)
    path(
        "<int:user_id>/",
        views.PublicUserProfileView.as_view(),
        name="public_profile",
    ),
]
