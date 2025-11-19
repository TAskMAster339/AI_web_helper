from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Category, Product


class ProductAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123",
        )
        self.category = Category.objects.create(
            name="Test Category",
            description="Test description",
        )

    def test_create_product(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "title": "Test Product",
            "slug": "test-product",
            "description": "Test description",
            "price": "99.99",
            "category": self.category.id,
            "stock": 10,
        }
        response = self.client.post("/api/products/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)  # noqa: PT009
        self.assertEqual(Product.objects.count(), 1)  # noqa: PT009

    def test_list_products(self):
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)  # noqa: PT009
