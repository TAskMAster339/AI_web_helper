"""
SEO views: sitemap.xml, robots.txt, JSON-LD schema endpoint.
"""

from __future__ import annotations

import logging

from api.models import Category, Product
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views import View

logger = logging.getLogger(__name__)

FRONTEND_URL = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = getattr(settings, "BACKEND_URL", "http://localhost:8000")


class RobotsTxtView(View):
    """Serve robots.txt with crawl rules."""

    def get(self, request):
        content = f"""User-agent: *
Allow: /
Allow: /products/
Allow: /about/

# Disallow private / service pages
Disallow: /admin/
Disallow: /dashboard/
Disallow: /login/
Disallow: /register/
Disallow: /reset-password/
Disallow: /forgot-password/
Disallow: /users/
Disallow: /products/new/
Disallow: /products/*/edit/

# Disallow API endpoints
Disallow: /api/

Sitemap: {BACKEND_URL}/sitemap.xml
"""
        return HttpResponse(content, content_type="text/plain; charset=utf-8")


class SitemapXmlView(View):
    """
    Dynamic sitemap.xml.
    Includes: home, about, catalogue, all published products.
    Excludes: auth/service pages, admin, user profiles.
    """

    def get(self, request):
        urls: list[dict] = []

        static_pages = [
            {"loc": f"{FRONTEND_URL}/", "priority": "1.0", "changefreq": "daily"},
            {
                "loc": f"{FRONTEND_URL}/about",
                "priority": "0.6",
                "changefreq": "monthly",
            },
            {
                "loc": f"{FRONTEND_URL}/products",
                "priority": "0.9",
                "changefreq": "hourly",
            },
        ]
        urls.extend(static_pages)

        urls.extend(
            {
                "loc": f"{FRONTEND_URL}/products?category={cat['name']}",
                "priority": "0.7",
                "changefreq": "daily",
            }
            for cat in Category.objects.all().values("name")
        )

        products = Product.objects.filter(status="published").values(
            "slug",
            "updated_at",
        )
        for p in products:
            lastmod = p["updated_at"].strftime("%Y-%m-%d") if p["updated_at"] else ""
            urls.append(
                {
                    "loc": f"{FRONTEND_URL}/products/{p['slug']}",
                    "lastmod": lastmod,
                    "priority": "0.8",
                    "changefreq": "weekly",
                },
            )

        xml_parts = ['<?xml version="1.0" encoding="UTF-8"?>']
        xml_parts.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
        for u in urls:
            xml_parts.append("  <url>")
            xml_parts.append(f"    <loc>{u['loc']}</loc>")
            if u.get("lastmod"):
                xml_parts.append(f"    <lastmod>{u['lastmod']}</lastmod>")
            if u.get("changefreq"):
                xml_parts.append(f"    <changefreq>{u['changefreq']}</changefreq>")
            if u.get("priority"):
                xml_parts.append(f"    <priority>{u['priority']}</priority>")
            xml_parts.append("  </url>")
        xml_parts.append("</urlset>")

        return HttpResponse(
            "\n".join(xml_parts),
            content_type="application/xml; charset=utf-8",
        )


class ProductSchemaView(View):
    """
    Return JSON-LD structured data (schema.org/Product) for a given slug.
    Used by frontend to inject <script type="application/ld+json">.
    """

    def get(self, request, slug: str):
        try:
            product = (
                Product.objects.select_related("category", "author")
                .prefetch_related("images")
                .get(slug=slug, status="published")
            )
        except Product.DoesNotExist:
            return JsonResponse({"detail": "Not found."}, status=404)

        image_urls = [img.url for img in product.images.all() if hasattr(img, "url")]

        schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.title,
            "description": product.description,
            "url": f"{FRONTEND_URL}/products/{product.slug}",
            "sku": str(product.id),
            "brand": {"@type": "Brand", "name": "AI Web Helper"},
            "offers": {
                "@type": "Offer",
                "price": str(product.price),
                "priceCurrency": "RUB",
                "availability": (
                    "https://schema.org/InStock"
                    if product.stock > 0
                    else "https://schema.org/OutOfStock"
                ),
                "url": f"{FRONTEND_URL}/products/{product.slug}",
            },
            "category": product.category.name,
        }
        if image_urls:
            schema["image"] = image_urls

        return JsonResponse(schema, json_dumps_params={"ensure_ascii": False})


class WebsiteSchemaView(View):
    """JSON-LD for the website itself (used on home page)."""

    def get(self, request):
        search_url = f"{FRONTEND_URL}/products?search={{search_term_string}}"
        schema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "AI Web Helper",
            "url": FRONTEND_URL,
            "description": "Minimalistic AI assistant web helper",
            "potentialAction": {
                "@type": "SearchAction",
                "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": search_url,
                },
                "query-input": "required name=search_term_string",
            },
        }
        return JsonResponse(schema, json_dumps_params={"ensure_ascii": False})
