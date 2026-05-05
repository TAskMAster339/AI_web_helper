from api.s3_service import generate_presigned_url
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import PasswordResetToken, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    can_make_request = serializers.SerializerMethodField()
    requests_remaining = serializers.SerializerMethodField()
    available_models = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = (
            "role",
            "role_display",
            "daily_requests_limit",
            "daily_requests_used",
            "can_make_request",
            "requests_remaining",
            "available_models",
            "avatar_url",
        )
        read_only_fields = (
            "role",
            "daily_requests_used",
            "can_make_request",
            "requests_remaining",
            "available_models",
            "avatar_url",
        )

    def get_can_make_request(self, obj):
        return obj.can_make_request()

    def get_requests_remaining(self, obj):
        if obj.role in ["premium", "admin"]:
            return "unlimited"
        obj.reset_daily_requests()
        return obj.daily_requests_limit - obj.daily_requests_used

    def get_available_models(self, obj):
        return obj.get_available_models()

    def get_avatar_url(self, obj):
        if not obj.avatar_s3_key:
            return None
        try:
            return generate_presigned_url(obj.avatar_s3_key, expires_in=3600)
        except Exception:
            return None


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "profile")
        read_only_fields = ("id", "username", "email")


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Allows user to update their own editable fields."""

    first_name = serializers.CharField(max_length=150, allow_blank=True, required=False)
    last_name = serializers.CharField(max_length=150, allow_blank=True, required=False)

    class Meta:
        model = User
        fields = ("first_name", "last_name")

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.save()
        return instance


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
                "Пользователь с таким логином уже существует",
            )
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Пользователь с таким email уже существует",
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
        """
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Пользователь с таким email не найден")  # noqa: B904
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
