import contextlib
import logging

from django.conf import settings
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response
from rest_framework.views import APIView
from users.permissions import CanMakeRequest

from .filters import ProductFilter
from .llm_service import (
    ACTIONS_MAP,
    CHAT_FALLBACK_CODE,
    ExternalLLMService,
    ExternalLLMServiceError,
    OllamaService,
)
from .models import Category, Order, Product, ProductImage
from .s3_service import delete_file, generate_presigned_url, upload_file
from .serializers import (
    CategorySerializer,
    OrderSerializer,
    ProductImageSerializer,
    ProductSerializer,
)
from .weather_service import WeatherService, WeatherServiceError

logger = logging.getLogger(__name__)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("name", "description")
    ordering_fields = ("name", "created_at")


class ProductViewSet(viewsets.ModelViewSet):
    queryset = (
        Product.objects.select_related("category", "author")
        .prefetch_related("images")
        .all()
    )
    serializer_class = ProductSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    filterset_class = ProductFilter
    search_fields = ("title", "description")
    ordering_fields = ("price", "created_at", "title", "stock")
    ordering = ("-created_at",)
    lookup_field = "slug"
    # Allow Unicode/Cyrillic characters in slugs (default pattern only allows ASCII)
    lookup_value_regex = r"[^/.]+"

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and (
            user.is_staff
            or getattr(getattr(user, "profile", None), "role", None) == "admin"
        ):
            return qs
        if user.is_authenticated:
            return qs.filter(Q(status="published") | Q(author=user))
        return qs.filter(status="published")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        is_admin = (
            getattr(getattr(request.user, "profile", None), "role", None) == "admin"
        )
        if (
            instance.author != request.user
            and not request.user.is_staff
            and not is_admin
        ):
            return Response(
                {"detail": "Вы не можете редактировать чужой товар."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        is_admin = (
            getattr(getattr(request.user, "profile", None), "role", None) == "admin"
        )
        if (
            instance.author != request.user
            and not request.user.is_staff
            and not is_admin
        ):
            return Response(
                {"detail": "Вы не можете удалить чужой товар."},
                status=status.HTTP_403_FORBIDDEN,
            )
        for img in instance.images.all():
            with contextlib.suppress(Exception):
                delete_file(img.s3_key)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        featured_products = (
            Product.objects.filter(status="published")
            .select_related("category", "author")
            .prefetch_related("images")[:6]
        )
        serializer = self.get_serializer(featured_products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def my(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        products = (
            Product.objects.filter(author=request.user)
            .select_related("category", "author")
            .prefetch_related("images")
            .order_by("-created_at")
        )
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


class ProductImageUploadView(APIView):
    """
    POST /api/products/<slug>/images/  — upload image
    GET  /api/products/<slug>/images/  — list images
    """

    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser,)

    def _get_product(self, slug):
        try:
            return Product.objects.get(slug=slug)
        except Product.DoesNotExist:
            return None

    def _check_owner(self, request, product):
        is_admin = (
            getattr(getattr(request.user, "profile", None), "role", None) == "admin"
        )
        return product.author == request.user or request.user.is_staff or is_admin

    def post(self, request, slug):
        product = self._get_product(slug)
        if not product:
            return Response(
                {"detail": "Товар не найден."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not self._check_owner(request, product):
            return Response(
                {"detail": "Нет прав для загрузки."},
                status=status.HTTP_403_FORBIDDEN,
            )

        file = request.FILES.get("file")
        if not file:
            return Response(
                {"detail": "Файл не передан."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = file.content_type
        if content_type not in settings.ALLOWED_IMAGE_TYPES:
            return Response(
                {
                    "detail": f"Недопустимый тип файла. "
                    f"Разрешены: {', '.join(settings.ALLOWED_IMAGE_TYPES)}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > settings.MAX_UPLOAD_SIZE:
            return Response(
                {
                    "detail": f"Файл слишком большой. "
                    f"Максимум: {settings.MAX_UPLOAD_SIZE // 1024 // 1024} MB",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            s3_key = upload_file(file, content_type, file.name)
        except Exception as exc:
            logger.exception("S3 upload failed: %s", exc)
            return Response(
                {"detail": "Ошибка загрузки в хранилище."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        image = ProductImage.objects.create(
            product=product,
            uploaded_by=request.user,
            s3_key=s3_key,
            original_filename=file.name,
            content_type=content_type,
            file_size=file.size,
        )
        return Response(
            ProductImageSerializer(image).data,
            status=status.HTTP_201_CREATED,
        )

    def get(self, request, slug):
        product = self._get_product(slug)
        if not product:
            return Response(
                {"detail": "Товар не найден."},
                status=status.HTTP_404_NOT_FOUND,
            )
        images = product.images.all()
        return Response(ProductImageSerializer(images, many=True).data)


class ProductImageDetailView(APIView):
    """
    GET    /api/products/<slug>/images/<image_id>/  — pre-signed URL
    DELETE /api/products/<slug>/images/<image_id>/  — delete image
    """

    permission_classes = (IsAuthenticated,)

    def _get_image(self, slug, image_id):
        try:
            return ProductImage.objects.select_related(
                "product",
                "product__author",
            ).get(
                id=image_id,
                product__slug=slug,
            )
        except ProductImage.DoesNotExist:
            return None

    def get(self, request, slug, image_id):
        image = self._get_image(slug, image_id)
        if not image:
            return Response(
                {"detail": "Изображение не найдено."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            url = generate_presigned_url(image.s3_key, expires_in=3600)
        except Exception as exc:
            logger.exception("Failed to generate presigned URL: %s", exc)
            return Response(
                {"detail": "Не удалось получить ссылку."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"url": url, "expires_in": 3600})

    def delete(self, request, slug, image_id):
        image = self._get_image(slug, image_id)
        if not image:
            return Response(
                {"detail": "Изображение не найдено."},
                status=status.HTTP_404_NOT_FOUND,
            )

        is_admin = (
            getattr(getattr(request.user, "profile", None), "role", None) == "admin"
        )
        can_delete = (
            request.user in (image.uploaded_by, image.product.author)
            or request.user.is_staff
            or is_admin
        )
        if not can_delete:
            return Response(
                {"detail": "Нет прав для удаления."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            delete_file(image.s3_key)
        except Exception as exc:
            logger.exception("S3 delete failed: %s", exc)
            return Response(
                {"detail": "Ошибка удаления из хранилища."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.all()
        return Order.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status == "pending":
            order.status = "cancelled"
            order.save()
            return Response({"status": "order cancelled"})
        return Response(
            {"error": "Cannot cancel this order"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class AskLLMView(APIView):
    permission_classes = (IsAuthenticated, CanMakeRequest)

    def post(self, request):
        question = request.data.get("question", "").strip()
        model = request.data.get("model", "alibayram/smollm3")
        mode = request.data.get("mode", "chat")
        provider = request.data.get("provider", "local")

        if not question:
            return self._error_response(
                "Question field is required",
                status.HTTP_400_BAD_REQUEST,
            )

        profile = request.user.profile
        if provider == "local" and not self._has_model_access(
            profile,
            model,
        ):
            return self._error_response(
                "You don't have access to this model",
                status.HTTP_403_FORBIDDEN,
            )

        svc = ExternalLLMService if provider == "external" else OllamaService
        try:
            requests_remaining = self._get_requests_remaining(profile)
            if mode == "navigate":
                return self._handle_navigation_mode(
                    svc,
                    question,
                    model,
                    profile,
                    requests_remaining,
                    provider,
                )
            return self._handle_chat_mode(
                svc,
                question,
                model,
                profile,
                requests_remaining,
                provider,
            )
        except ExternalLLMServiceError as e:
            logger.warning("External LLM error: %s", e)
            return self._error_response(
                f"Внешний LLM недоступен: {e!s}",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.exception("Ошибка в обработке LLM: %s", e)
            return self._error_response(
                f"LLM processing error: {e!s}",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _error_response(self, message, status_code):
        return Response({"error": message}, status=status_code)

    def _has_model_access(self, profile, model):
        available_models = profile.get_available_models()
        return available_models == "all" or model in available_models

    def _get_requests_remaining(self, profile):
        is_premium = profile.role in ["premium", "admin"]
        if is_premium:
            return "unlimited"
        return profile.daily_requests_limit - profile.daily_requests_used

    def _handle_navigation_mode(
        self,
        svc,
        question,
        model,
        profile,
        requests_remaining,
        provider,
    ):
        action_code = svc.get_action_code(question, model)
        if action_code == CHAT_FALLBACK_CODE:
            return self._generate_fallback_response(
                svc,
                question,
                model,
                profile,
                requests_remaining,
                provider,
            )
        filters, weather_city = self._extract_navigation_data(
            svc,
            question,
            model,
            action_code,
        )
        action_description = ACTIONS_MAP.get(
            action_code,
            "Неизвестное действие",
        )
        profile.increment_requests()
        return Response(
            {
                "question": question,
                "action_code": action_code,
                "action_description": action_description,
                "is_fallback": False,
                "filters": filters,
                "weather_city": weather_city,
                "mode": "navigate",
                "model": model,
                "provider": provider,
                "requests_remaining": requests_remaining,
            },
            status=status.HTTP_200_OK,
        )

    def _generate_fallback_response(
        self,
        svc,
        question,
        model,
        profile,
        requests_remaining,
        provider,
    ):
        fallback_answer = svc.generate_response(question, model)
        profile.increment_requests()
        return Response(
            {
                "question": question,
                "action_code": CHAT_FALLBACK_CODE,
                "action_description": ACTIONS_MAP.get(
                    CHAT_FALLBACK_CODE,
                    "Свободный чат",
                ),
                "is_fallback": True,
                "answer": fallback_answer,
                "mode": "navigate",
                "model": model,
                "provider": provider,
                "requests_remaining": requests_remaining,
            },
            status=status.HTTP_200_OK,
        )

    def _extract_navigation_data(self, svc, question, model, action_code):
        filters, weather_city = {}, None
        if action_code == "004":
            filters = self._get_product_filters(svc, question, model)
        elif action_code == "007":
            weather_city = self._get_weather_city(svc, question, model)
        return filters, weather_city

    def _get_product_filters(self, svc, question, model):
        try:
            category_names = list(
                Category.objects.values_list(
                    "name",
                    flat=True,
                ).order_by("name"),
            )
            return svc.get_product_filters(
                question,
                model,
                category_names,
            )
        except Exception as e:
            logger.warning("Failed to extract filters: %s", e)
            return {}

    def _get_weather_city(self, svc, question, model):
        try:
            return svc.get_weather_city(question, model)
        except Exception as e:
            logger.warning("Failed to extract weather city: %s", e)
            return "Moscow"

    def _handle_chat_mode(
        self,
        svc,
        question,
        model,
        profile,
        requests_remaining,
        provider,
    ):
        answer = svc.generate_response(question, model)
        profile.increment_requests()
        return Response(
            {
                "question": question,
                "answer": answer,
                "mode": "chat",
                "model": model,
                "provider": provider,
                "requests_remaining": requests_remaining,
            },
            status=status.HTTP_200_OK,
        )


class GetAvailableModelsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        provider = request.query_params.get("provider", "local")
        try:
            if provider == "external":
                models = ExternalLLMService.list_available_models()
                return Response(
                    {"models": models, "provider": "external"},
                    status=status.HTTP_200_OK,
                )

            # local
            all_models = OllamaService.list_available_models()
            if hasattr(request.user, "profile"):
                available_models = request.user.profile.get_available_models()
                models = all_models if available_models == "all" else available_models
            else:
                models = ["alibayram/smollm3"]
            return Response(
                {"models": models, "provider": "local"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.exception("Ошибка при получении моделей: %s", e)
            return Response(
                {"models": ["alibayram/smollm3"], "provider": "local"},
                status=status.HTTP_200_OK,
            )


class GetActionsMapView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({"actions": ACTIONS_MAP}, status=status.HTTP_200_OK)


class WeatherView(APIView):
    """
    GET /api/weather/?city=Moscow
    Returns current weather from OpenWeatherMap.
    Publicly accessible; degrades gracefully when API key is absent.
    """

    permission_classes = (AllowAny,)

    def get(self, request):
        city = request.query_params.get("city", "Moscow").strip()
        if not city:
            return Response(
                {"error": "city parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data = WeatherService.get_weather_with_cache(city)
            return Response(data, status=status.HTTP_200_OK)
        except WeatherServiceError as exc:
            logger.warning("WeatherView error for city=%s: %s", city, exc)
            return Response(
                {"error": str(exc), "available": False},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            logger.exception("Unexpected WeatherView error: %s", exc)
            return Response(
                {
                    "error": "Weather service temporarily unavailable",
                    "available": False,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
