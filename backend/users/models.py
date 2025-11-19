import secrets
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


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
