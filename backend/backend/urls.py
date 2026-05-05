from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.http import JsonResponse
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


def handler404(request, exception=None):
    return JsonResponse({"detail": "Not found."}, status=404)


def handler403(request, exception=None):
    return JsonResponse({"detail": "Permission denied."}, status=403)


def handler500(request):
    return JsonResponse({"detail": "Internal server error."}, status=500)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/users/", include("users.urls")),
    path("api-auth/", include("rest_framework.urls")),
    # SEO: sitemap, robots, JSON-LD schemas
    path("", include("seo.urls")),
]
urlpatterns += staticfiles_urlpatterns()
