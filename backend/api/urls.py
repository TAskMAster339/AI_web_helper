from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AskLLMView,
    CategoryViewSet,
    GetActionsMapView,
    GetAvailableModelsView,
    OrderViewSet,
    ProductImageDetailView,
    ProductImageUploadView,
    ProductViewSet,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")

urlpatterns = [
    path(
        "",
        include(router.urls),
    ),  # Product images — use <str:slug> instead of <slug:slug> to support Unicode/Cyrillic slugs
    path(
        "products/<str:slug>/images/",
        ProductImageUploadView.as_view(),
        name="product_images",
    ),
    path(
        "products/<str:slug>/images/<int:image_id>/",
        ProductImageDetailView.as_view(),
        name="product_image_detail",
    ),
    # LLM
    path("llm/ask/", AskLLMView.as_view(), name="ask_llm"),
    path("llm/models/", GetAvailableModelsView.as_view(), name="available_models"),
    path("llm/actions/", GetActionsMapView.as_view(), name="actions_map"),
]
