from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Permission to check if user is admin
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role == "admin"
        )


class IsPremiumOrAdmin(permissions.BasePermission):
    """
    Permission to check if user is premium or admin
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role in ["premium", "admin"]
        )


class CanMakeRequest(permissions.BasePermission):
    """
    Permission to check if user can make LLM request
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, "profile"):
            return False

        return request.user.profile.can_make_request()
