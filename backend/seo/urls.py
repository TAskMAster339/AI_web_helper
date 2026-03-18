from django.urls import path

from .views import (
    ProductSchemaView,
    RobotsTxtView,
    SitemapXmlView,
    WebsiteSchemaView,
)

urlpatterns = [
    path("robots.txt", RobotsTxtView.as_view(), name="robots_txt"),
    path("sitemap.xml", SitemapXmlView.as_view(), name="sitemap_xml"),
    path("schema/website/", WebsiteSchemaView.as_view(), name="schema_website"),
    path(
        "schema/products/<str:slug>/",
        ProductSchemaView.as_view(),
        name="schema_product",
    ),
]
