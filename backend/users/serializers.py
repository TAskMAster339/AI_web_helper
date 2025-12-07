from django.contrib.auth.models import User
from rest_framework import serializers

from .models import PasswordResetToken


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")
        read_only_fields = ("id",)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        label="Confirm Password",
    )

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "password2",
            "first_name",
            "last_name",
        )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "Пользователь с таким логином уже существует",  # noqa: RUF001
            )
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Пользователь с таким email уже существует",  # noqa: RUF001
            )
        return value

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField(label="Логин или Email")
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        login_value = data.get("login")
        password = data.get("password")
        user = None

        # Пробуем найти по username
        try:
            user = User.objects.get(username=login_value)
        except User.DoesNotExist:
            # Пробуем найти по email
            try:
                user = User.objects.get(email=login_value)
            except User.DoesNotExist:
                user = None

        if user is None:
            raise serializers.ValidationError("Пользователь не найден")

        # Проверяем пароль
        if not user.check_password(password):
            raise serializers.ValidationError("Неверный пароль")

        data["user"] = user
        return data


class TokenSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class PasswordResetSerializer(serializers.Serializer):
    """
    Сериализатор для запроса восстановления пароля
    """

    email = serializers.EmailField()

    def validate_email(self, value):
        """
        Проверяет, существует ли пользователь с таким email
        """  # noqa: RUF002
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Пользователь с таким email не найден")  # noqa: B904, RUF001
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Сериализатор для подтверждения восстановления пароля
    """

    token = serializers.CharField(max_length=255)
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_token(self, value):
        """
        Проверяет, валидный ли токен
        """
        try:
            reset_token = PasswordResetToken.objects.get(token=value)
            if not reset_token.is_valid():
                raise serializers.ValidationError("Токен истёк или уже был использован")
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError("Токен не найден")  # noqa: B904
        return value

    def save(self):
        """
        Сохраняет новый пароль и помечает токен как использованный
        """
        token_str = self.validated_data["token"]
        password = self.validated_data["password"]

        reset_token = PasswordResetToken.objects.get(token=token_str)
        user = reset_token.user

        # Устанавливаем новый пароль
        user.set_password(password)
        user.save()

        # Помечаем токен как использованный
        reset_token.is_used = True
        reset_token.save()

        return user
