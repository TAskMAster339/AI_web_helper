import secrets
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class UserProfile(models.Model):
    """
    User profile with roles and limits
    """

    ROLE_CHOICES = (
        ("user", "Обычный пользователь"),
        ("premium", "Пользователь с подпиской"),  # noqa: RUF001
        ("admin", "Администратор"),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="user",
    )
    # Limits for regular users
    daily_requests_limit = models.IntegerField(default=10)
    daily_requests_used = models.IntegerField(default=0)
    last_request_reset = models.DateField(auto_now_add=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

    def reset_daily_requests(self):
        """Reset request counter if day has passed"""
        today = timezone.now().date()
        if self.last_request_reset < today:
            self.daily_requests_used = 0
            self.last_request_reset = today
            self.save()

    def can_make_request(self):
        """Check if user can make a request"""
        self.reset_daily_requests()

        # Premium and admin without limits
        if self.role in ["premium", "admin"]:
            return True

        # Regular users with limit
        return self.daily_requests_used < self.daily_requests_limit

    def increment_requests(self):
        """Increment request counter"""
        self.reset_daily_requests()
        if self.role == "user":
            self.daily_requests_used += 1
            self.save()

    def get_available_models(self):
        """Get list of available models for user"""
        if self.role in ["premium", "admin"]:
            return "all"  # All models
        return ["alibayram/smollm3"]  # Only one model for regular users


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create profile when creating user"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save profile when saving user"""
    if hasattr(instance, "profile"):
        instance.profile.save()


class PasswordResetToken(models.Model):
    """
    Модель для хранения токенов восстановления пароля
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"Password reset token for {self.user.username}"

    @classmethod
    def create_token(cls, user):
        """
        Создает новый токен восстановления пароля для пользователя
        """
        # Удаляем старые, неиспользованные токены
        cls.objects.filter(user=user, is_used=False).delete()

        # Создаем новый токен
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=24)  # Токен действует 24 часа

        return cls.objects.create(user=user, token=token, expires_at=expires_at)

    def is_valid(self):
        """
        Проверяет, валидный ли токен
        """
        if self.is_used:
            return False
        return not timezone.now() > self.expires_at
