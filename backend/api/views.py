import logging

from django.db.models import Q
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from .llm_service import ACTIONS_MAP, OllamaService
from .models import Category, Order, Product
from .serializers import (
    CategorySerializer,
    OrderSerializer,
    ProductSerializer,
)

logger = logging.getLogger(__name__)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("name", "description")
    ordering_fields = ("name", "created_at")


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category", "author").all()
    serializer_class = ProductSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("title", "description")
    ordering_fields = ("price", "created_at", "title")
    lookup_field = "slug"

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        """Получить избранные товары"""
        featured_products = self.queryset.filter(status="published")[:5]
        serializer = self.get_serializer(featured_products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def search(self, request):
        """Расширенный поиск"""
        query = request.query_params.get("q", "")
        min_price = request.query_params.get("min_price")
        max_price = request.query_params.get("max_price")
        category = request.query_params.get("category")

        products = self.queryset.filter(status="published")

        if query:
            products = products.filter(
                Q(title__icontains=query) | Q(description__icontains=query),
            )

        if min_price:
            products = products.filter(price__gte=min_price)

        if max_price:
            products = products.filter(price__lte=max_price)

        if category:
            products = products.filter(category__id=category)

        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        """Пользователи видят только свои заказы"""
        if self.request.user.is_staff:
            return Order.objects.all()
        return Order.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Отменить заказ"""
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
    """
    Эндпоинт для отправки вопроса в LLM и получения кода действия.

    POST /api/llm/ask/
    {
        "question": "Что ты мне порекомендуешь?",
        "model": "alibayram/smollm3",
        "mode": "chat"  # или "navigate"
    }
    """

    permission_classes = (AllowAny,)

    def post(self, request):
        """Обработать POST запрос с вопросом"""  # noqa: RUF002
        question = request.data.get("question", "").strip()
        model = request.data.get("model", "alibayram/smollm3")
        mode = request.data.get("mode", "chat")  # "chat" или "navigate"

        if not question:
            return Response(
                {"error": "Question field is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if mode == "navigate":
                # Режим навигации - получить код действия
                action_code = OllamaService.get_action_code(question, model)
                action_description = ACTIONS_MAP.get(
                    action_code,
                    "Неизвестное действие",
                )
                return Response(
                    {
                        "question": question,
                        "action_code": action_code,
                        "action_description": action_description,
                        "mode": "navigate",
                        "model": model,
                    },
                    status=status.HTTP_200_OK,
                )
            # Обычный режим чата - получить полный ответ
            answer = OllamaService.generate_response(question, model)
            return Response(
                {
                    "question": question,
                    "answer": answer,
                    "mode": "chat",
                    "model": model,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Ошибка в обработке LLM: {e!s}", exc_info=True)  # noqa: G004, G201
            return Response(
                {"error": f"LLM processing error: {e!s}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GetAvailableModelsView(APIView):
    """
    Получить список доступных моделей в Ollama

    GET /api/llm/models/
    """

    permission_classes = (AllowAny,)

    def get(self, request):
        """Получить доступные модели"""
        try:
            models = OllamaService.list_available_models()
            return Response(
                {"models": models},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.error(f"Ошибка при получении моделей: {e!s}", exc_info=True)  # noqa: G004, G201
            return Response(
                {"models": ["alibayram/smollm3"]},
                status=status.HTTP_200_OK,
            )


class GetActionsMapView(APIView):
    """
    Получить список всех доступных кодов действий

    GET /api/llm/actions/
    """

    permission_classes = (AllowAny,)

    def get(self, request):
        """Получить ACTIONS_MAP"""
        return Response(
            {"actions": ACTIONS_MAP},
            status=status.HTTP_200_OK,
        )
