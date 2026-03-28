import contextlib
import logging
import uuid

from api.s3_service import delete_file, upload_file
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.mail import send_mail
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PasswordResetToken
from .permissions import IsAdminUser
from .serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save(is_active=False)
            activation_token = str(uuid.uuid4())
            cache.set(f"activate:{activation_token}", user.id, timeout=60 * 60 * 24)
            activation_url = (
                f"{settings.BACKEND_URL}/api/users/activate/{activation_token}/"
            )
            message = (
                f"Добро пожаловать в AI Web Helper!\n"
                f"Для активации аккаунта перейдите по ссылке:\n\n"
                f"{activation_url}\n\n"
                f"Ссылка действительна 24 часа."
            )
            send_mail(
                subject="Подтверждение регистрации",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            return Response(
                {"detail": "Письмо с подтверждением отправлено на вашу почту"},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            refresh = RefreshToken.for_user(user)
            response = Response(
                {
                    "user": UserSerializer(user).data,
                    "access": str(refresh.access_token),
                },
                status=status.HTTP_200_OK,
            )
            response.set_cookie(
                "refresh_token",
                str(refresh),
                max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActivateAccountView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, token):
        user_id = cache.get(f"activate:{token}")
        if not user_id:
            return Response(
                {"detail": "Токен истёк или недействителен"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.get(id=user_id, is_active=False)
        except User.DoesNotExist:
            return Response(
                {"detail": "Пользователь не найден или уже активирован"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = True
        user.save()
        cache.delete(f"activate:{token}")
        return HttpResponseRedirect(f"{settings.FRONTEND_URL}/success-activate")


class UserDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)


class AvatarUploadView(APIView):
    """
    POST   /users/me/avatar/ - upload or replace user avatar
    DELETE /users/me/avatar/ - remove user avatar
    """

    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser,)

    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}  # noqa: RUF012
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"detail": "Файл не передан."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.content_type not in self.ALLOWED_TYPES:
            return Response(
                {"detail": "Разрешены только JPEG, PNG, WebP, GIF."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > self.MAX_SIZE:
            return Response(
                {"detail": "Файл слишком большой. Максимум 5 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = request.user.profile

        if profile.avatar_s3_key:
            with contextlib.suppress(Exception):
                delete_file(profile.avatar_s3_key)

        try:
            s3_key = upload_file(file, file.content_type, file.name)
        except Exception as exc:
            logger.exception("Avatar upload failed: %s", exc)
            return Response(
                {"detail": "Ошибка загрузки в хранилище."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        profile.avatar_s3_key = s3_key
        profile.save(update_fields=["avatar_s3_key"])
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

    def delete(self, request):
        profile = request.user.profile
        if profile.avatar_s3_key:
            with contextlib.suppress(Exception):
                delete_file(profile.avatar_s3_key)
            profile.avatar_s3_key = ""
            profile.save(update_fields=["avatar_s3_key"])

        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        response = Response(
            {"detail": "Successfully logged out"},
            status=status.HTTP_200_OK,
        )
        response.delete_cookie("refresh_token")
        return response


class PasswordResetView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            user = User.objects.get(email=email)
            reset_token = PasswordResetToken.create_token(user)
            frontend_url = (
                f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
            )
            message = (
                f"Перейдите по ссылке для восстановления пароля:"
                f"\n{frontend_url}\n\nСсылка действительна 24 часа."
            )
            try:
                send_mail(
                    subject="Восстановление пароля",
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
                return Response(
                    {"detail": "Письмо с инструкцией отправлено на вашу почту"},
                    status=status.HTTP_200_OK,
                )
            except Exception as e:
                return Response(
                    {"detail": f"Ошибка при отправке письма: {e!s}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Пароль успешно изменён"},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TokenRefreshView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token не найден"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            response = Response({"access": access_token}, status=status.HTTP_200_OK)

            if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False):
                user_id = refresh.get("user_id")
                user = User.objects.get(id=user_id)
                new_refresh = RefreshToken.for_user(user)
                response.set_cookie(
                    "refresh_token",
                    str(new_refresh),
                    max_age=settings.SIMPLE_JWT[
                        "REFRESH_TOKEN_LIFETIME"
                    ].total_seconds(),
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite="Lax",
                )
        except (TokenError, User.DoesNotExist):
            return Response(
                {"detail": "Недействительный refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        else:
            return response


class ManageUsersView(APIView):
    permission_classes = (IsAdminUser,)

    def get(self, request):
        from rest_framework.pagination import PageNumberPagination

        class CustomPagination(PageNumberPagination):
            page_size = 20
            page_size_query_param = "page_size"
            max_page_size = 100

        paginator = CustomPagination()
        users = User.objects.select_related("profile").all()
        page = paginator.paginate_queryset(users, request)
        serializer = UserSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class PublicUserProfileView(APIView):
    """
    GET /users/<int:user_id>/  — публичный профиль пользователя (доступен всем авторизованным).
    PATCH /users/<int:user_id>/  — редактирование профиля (только для админа).
    """

    permission_classes = (IsAuthenticated,)

    def get(self, request, user_id):
        try:
            user = User.objects.select_related("profile").get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Пользователь не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    def patch(self, request, user_id):
        if request.user.profile.role != "admin":
            return Response(
                {"detail": "Недостаточно прав"},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            user = User.objects.select_related("profile").get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Пользователь не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )
        role = request.data.get("role")
        if role and role in ["user", "premium", "admin"]:
            user.profile.role = role
            user.profile.save(update_fields=["role"])
        serializer = UpdateProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class UpdateUserRoleView(APIView):
    permission_classes = (IsAdminUser,)

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Пользователь не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )
        role = request.data.get("role")
        if role not in ["user", "premium", "admin"]:
            return Response(
                {"detail": "Недопустимая роль"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile = user.profile
        profile.role = role
        profile.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
