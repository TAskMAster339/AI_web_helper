# Generated migration for UserProfile model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("user", "Обычный пользователь"),  # noqa: RUF001
                            ("premium", "Пользователь с подпиской"),  # noqa: RUF001
                            ("admin", "Администратор"),  # noqa: RUF001
                        ],
                        default="user",
                        max_length=20,
                    ),
                ),
                (
                    "daily_requests_limit",
                    models.IntegerField(default=10),
                ),
                (
                    "daily_requests_used",
                    models.IntegerField(default=0),
                ),
                (
                    "last_request_reset",
                    models.DateField(auto_now_add=True),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
    ]
