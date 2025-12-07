import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.mail import send_mail
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PasswordResetToken
from .serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            # Создаем пользователя неактивным
            user = serializer.save(is_active=False)

            activation_token = str(uuid.uuid4())
            # Сохраняем токен в кэш
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
                {"detail": "Письмо с подтверждением отправлено на вашу почту"},  # noqa: RUF001
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

            # Устанавливаем refresh token в httpOnly cookie
            response.set_cookie(
                "refresh_token",
                str(refresh),
                max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
                httponly=True,
                secure=not settings.DEBUG,  # HTTPS в продакшене
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
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        response = Response(
            {"detail": "Successfully logged out"},
            status=status.HTTP_200_OK,
        )

        # Удаляем refresh token cookie при логауте
        response.delete_cookie("refresh_token")

        return response


class PasswordResetView(APIView):
    """
    Эндпоинт для запроса восстановления пароля
    POST /users/password-reset/ с телом {"email": "user@example.com"}
    """  # noqa: RUF002

    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            user = User.objects.get(email=email)

            # Создаем токен восстановления
            reset_token = PasswordResetToken.create_token(user)

            # Формируем ссылку для восстановления пароля
            # Замените на ваш фронтенд URL
            frontend_url = (
                f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
            )

            # Отправляем письмо
            message = (
                f"Перейдите по ссылке для восстановления пароля:"
                f"\n{frontend_url}\n\nСсылка действительна 24 часа."  # noqa: RUF001
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
                    {"detail": "Письмо с инструкцией отправлено на вашу почту"},  # noqa: RUF001
                    status=status.HTTP_200_OK,
                )
            except Exception as e:
                return Response(
                    {"detail": f"Ошибка при отправке письма: {e!s}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """
    Эндпоинт для подтверждения восстановления пароля
    POST /users/password-reset-confirm/ с телом {"token": "...", "password": "..."}
    """  # noqa: RUF002

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

            response = Response(
                {"access": access_token},
                status=status.HTTP_200_OK,
            )

            # Если включена ротация токенов, обновляем refresh token
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
