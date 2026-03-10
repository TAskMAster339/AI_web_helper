from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import PasswordResetToken, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = "Profile"
    fields = (
        "role",
        "daily_requests_limit",
        "daily_requests_used",
        "last_request_reset",
    )
    readonly_fields = ("daily_requests_used", "last_request_reset")


class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "get_role",
    )
    list_filter = ("is_staff", "is_superuser", "is_active", "profile__role")

    def get_role(self, obj):
        return obj.profile.get_role_display() if hasattr(obj, "profile") else "N/A"

    get_role.short_description = "Role"


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "role",
        "daily_requests_limit",
        "daily_requests_used",
        "last_request_reset",
    )
    list_filter = ("role", "last_request_reset")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "created_at", "expires_at", "is_used")
    list_filter = ("is_used", "created_at")
    search_fields = ("user__username", "user__email", "token")
    readonly_fields = ("created_at",)


# Unregister the default User admin and register our custom one
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
