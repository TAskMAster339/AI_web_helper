"""
Unit tests for API models.

Tests:
- Category model
- Product model
- Order and OrderItem models
- ProductImage model
"""

import time
from decimal import Decimal

import pytest
from api.models import Category, Order, OrderItem, Product, ProductImage
from django.db import IntegrityError
from tests.conftest import CategoryFactory, ProductFactory, UserFactory

pytestmark = pytest.mark.unit


class TestCategoryModel:
    """Tests for the Category model."""

    def test_category_creation(self, db):
        """Test basic category creation."""
        category = Category.objects.create(
            name="Electronics",
            description="Electronic devices",
        )
        assert category.name == "Electronics"
        assert category.description == "Electronic devices"
        assert category.created_at is not None
        assert category.updated_at is not None

    def test_category_string_representation(self, db):
        """Test category __str__ method."""
        category = Category.objects.create(name="Books")
        assert str(category) == "Books"

    def test_category_name_uniqueness(self, db):
        """Test that category names must be unique."""
        Category.objects.create(name="Unique Category")
        with pytest.raises(IntegrityError):
            Category.objects.create(name="Unique Category")

    def test_category_ordering(self, db):
        """Test that categories are ordered by name."""
        CategoryFactory.create(name="Zebras")
        CategoryFactory.create(name="Apple")
        CategoryFactory.create(name="Banana")

        categories = list(Category.objects.all())
        names = [c.name for c in categories]
        assert names == sorted(names)

    def test_category_products_count(self, db):
        """Test that products_count relation works."""
        category = CategoryFactory.create()
        ProductFactory.create(category=category)
        ProductFactory.create(category=category)

        assert category.products.count() == 2  # noqa: PLR2004


class TestProductModel:
    """Tests for the Product model."""

    def test_product_creation(self, db):
        """Test basic product creation."""
        user = UserFactory.create()
        category = CategoryFactory.create()

        product = Product.objects.create(
            title="Laptop",
            slug="laptop",
            description="Gaming laptop",
            price=Decimal("999.99"),
            category=category,
            author=user,
            status="published",
            stock=5,
        )

        assert product.title == "Laptop"
        assert product.price == Decimal("999.99")
        assert product.status == "published"
        assert product.stock == 5  # noqa: PLR2004
        assert product.author == user
        assert product.category == category

    def test_product_string_representation(self, db):
        """Test product __str__ method."""
        product = ProductFactory.create(title="iPhone 15")
        assert str(product) == "iPhone 15"

    def test_product_slug_uniqueness(self, db):
        """Test that product slugs must be unique."""
        ProductFactory.create(slug="unique-product")
        with pytest.raises(IntegrityError):
            ProductFactory.create(slug="unique-product")

    def test_product_default_status_is_draft(self, db):
        """Test that new products default to 'draft' status."""
        user = UserFactory.create()
        category = CategoryFactory.create()
        product = Product.objects.create(
            title="New Product",
            slug="new-product",
            description="Test",
            price=Decimal("10.00"),
            category=category,
            author=user,
        )
        assert product.status == "draft"

    def test_product_status_choices(self, db):
        """Test that only valid status values are accepted."""
        statuses = ["draft", "published", "archived"]
        category = CategoryFactory.create()
        user = UserFactory.create()

        for status in statuses:
            product = ProductFactory.create(
                status=status,
                category=category,
                author=user,
                slug=f"product-{status}",
            )
            assert product.status == status

    def test_product_price_validation(self, db):
        """Test that product price is stored correctly."""
        product = ProductFactory.create(
            price=Decimal("123.45"),
        )
        assert product.price == Decimal("123.45")

    def test_product_stock_integer(self, db):
        """Test that stock is stored as integer."""
        product = ProductFactory.create(stock=42)
        assert product.stock == 42  # noqa: PLR2004
        assert isinstance(product.stock, int)

    def test_product_ordering(self, db):
        """Test that products are ordered by creation date (newest first)."""
        ProductFactory.create(title="First")
        time.sleep(0.01)
        ProductFactory.create(title="Second")

        products = list(Product.objects.all())
        assert products[0].title == "Second"
        assert products[1].title == "First"

    def test_product_cascade_delete(self, db):
        """Test that deleting a user deletes their products."""
        user = UserFactory.create()
        product = ProductFactory.create(author=user)

        assert Product.objects.filter(id=product.id).exists()
        user.delete()
        assert not Product.objects.filter(id=product.id).exists()

    def test_product_category_cascade_delete(self, db):
        """Test that deleting a category deletes its products."""
        category = CategoryFactory.create()
        product = ProductFactory.create(category=category)

        assert Product.objects.filter(id=product.id).exists()
        category.delete()
        assert not Product.objects.filter(id=product.id).exists()


class TestOrderModel:
    """Tests for the Order model."""

    def test_order_creation(self, db):
        """Test basic order creation."""
        user = UserFactory.create()
        order = Order.objects.create(
            user=user,
            total_price=Decimal("199.99"),
            status="pending",
        )

        assert order.user == user
        assert order.total_price == Decimal("199.99")
        assert order.status == "pending"
        assert order.created_at is not None

    def test_order_string_representation(self, db):
        """Test order __str__ method."""
        user = UserFactory.create(username="john")
        order = Order.objects.create(
            user=user,
            total_price=Decimal("100.00"),
        )
        assert "john" in str(order)
        assert f"#{order.id}" in str(order)

    def test_order_default_status(self, db):
        """Test that orders default to 'pending' status."""
        user = UserFactory.create()
        order = Order.objects.create(
            user=user,
            total_price=Decimal("100.00"),
        )
        assert order.status == "pending"

    def test_order_cascade_delete_with_user(self, db):
        """Test that deleting user deletes orders."""
        user = UserFactory.create()
        order = Order.objects.create(
            user=user,
            total_price=Decimal("100.00"),
        )

        user.delete()
        assert not Order.objects.filter(id=order.id).exists()


class TestOrderItemModel:
    """Tests for the OrderItem model."""

    def test_order_item_creation(self, db):
        """Test basic order item creation."""
        product = ProductFactory.create()
        order = Order.objects.create(
            user=UserFactory.create(),
            total_price=product.price,
        )

        item = OrderItem.objects.create(
            order=order,
            product=product,
            quantity=2,
            price=product.price,
        )

        assert item.order == order
        assert item.product == product
        assert item.quantity == 2  # noqa: PLR2004
        assert item.price == product.price

    def test_order_item_string_representation(self, db):
        """Test order item __str__ method."""
        product = ProductFactory.create(title="Laptop")
        order = Order.objects.create(
            user=UserFactory.create(),
            total_price=Decimal("100.00"),
        )
        item = OrderItem.objects.create(
            order=order,
            product=product,
            quantity=3,
            price=product.price,
        )

        assert "3x Laptop" in str(item)

    def test_order_item_cascade_delete(self, db):
        """Test that deleting order deletes items."""
        product = ProductFactory.create()
        order = Order.objects.create(
            user=UserFactory.create(),
            total_price=Decimal("100.00"),
        )
        item = OrderItem.objects.create(
            order=order,
            product=product,
            quantity=1,
            price=product.price,
        )

        order.delete()
        assert not OrderItem.objects.filter(id=item.id).exists()


class TestProductImageModel:
    """Tests for the ProductImage model."""

    def test_product_image_creation(self, db):
        """Test basic product image creation."""
        product = ProductFactory.create()
        user = UserFactory.create()

        image = ProductImage.objects.create(
            product=product,
            uploaded_by=user,
            s3_key="images/product-1.jpg",
            original_filename="photo.jpg",
            content_type="image/jpeg",
            file_size=1024,
        )

        assert image.product == product
        assert image.uploaded_by == user
        assert image.s3_key == "images/product-1.jpg"
        assert image.file_size == 1024  # noqa: PLR2004

    def test_product_image_string_representation(self, db):
        """Test product image __str__ method."""
        product = ProductFactory.create(title="Camera")
        image = ProductImage.objects.create(
            product=product,
            uploaded_by=UserFactory.create(),
            s3_key="test.jpg",
            original_filename="photo.jpg",
            content_type="image/jpeg",
            file_size=1024,
        )

        assert "photo.jpg" in str(image)
        assert "Camera" in str(image)

    def test_product_image_ordering(self, db):
        """Test that images are ordered by creation date (newest first)."""
        product = ProductFactory.create()
        user = UserFactory.create()

        image1 = ProductImage.objects.create(
            product=product,
            uploaded_by=user,
            s3_key="image1.jpg",
            original_filename="image1.jpg",
            content_type="image/jpeg",
            file_size=1024,
        )
        time.sleep(0.01)
        image2 = ProductImage.objects.create(
            product=product,
            uploaded_by=user,
            s3_key="image2.jpg",
            original_filename="image2.jpg",
            content_type="image/jpeg",
            file_size=2048,
        )

        images = list(ProductImage.objects.all())
        assert images[0].id == image2.id
        assert images[1].id == image1.id

    def test_product_image_cascade_delete(self, db):
        """Test that deleting product deletes images."""
        product = ProductFactory.create()
        image = ProductImage.objects.create(
            product=product,
            uploaded_by=UserFactory.create(),
            s3_key="test.jpg",
            original_filename="photo.jpg",
            content_type="image/jpeg",
            file_size=1024,
        )

        product.delete()
        assert not ProductImage.objects.filter(id=image.id).exists()
