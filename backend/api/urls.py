from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AskLLMView,
    CategoryViewSet,
    ListModelsView,
    OrderViewSet,
    ProductViewSet,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")

urlpatterns = [
    path("", include(router.urls)),
    path("llm/ask/", AskLLMView.as_view(), name="ask-llm"),
    path("llm/models/", ListModelsView.as_view(), name="list-models"),
]
