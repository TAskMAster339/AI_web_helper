# filepath: c:\projects\fullstack\work\backend\api\serializers.py
from django.contrib.auth.models import User
from django.utils.text import slugify
from rest_framework import serializers

from .models import Category, Order, OrderItem, Product, ProductImage
from .s3_service import generate_presigned_url


class UserSerializer(serializers.ModelSerializer):
    """Lightweight user serializer used inside ProductSerializer (author field)."""

    avatar_url = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "avatar_url",
        )
        read_only_fields = ("id",)

    def get_avatar_url(self, obj):
        try:
            profile = obj.profile
            if profile.avatar_s3_key:
                return generate_presigned_url(profile.avatar_s3_key, expires_in=3600)
        except Exception:
            pass
        return None

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "description",
            "products_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    uploaded_by_username = serializers.CharField(
        source="uploaded_by.username",
        read_only=True,
    )

    class Meta:
        model = ProductImage
        fields = (
            "id",
            "original_filename",
            "content_type",
            "file_size",
            "url",
            "uploaded_by_username",
            "created_at",
        )
        read_only_fields = fields

    def get_url(self, obj):
        """Return a pre-signed URL valid for 1 hour."""
        try:
            return generate_presigned_url(obj.s3_key, expires_in=3600)
        except Exception:
            return None


class ProductSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    images_count = serializers.IntegerField(source="images.count", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "price",
            "category",
            "category_name",
            "author",
            "status",
            "stock",
            "images",
            "images_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "author", "created_at", "updated_at")

    def _unique_slug(self, base: str, instance_pk=None) -> str:
        """Generate a slug that is unique in the Product table."""
        slug = slugify(base, allow_unicode=True)
        if not slug:
            slug = "product"
        candidate = slug
        n = 1
        qs = Product.objects.all()
        if instance_pk:
            qs = qs.exclude(pk=instance_pk)
        while qs.filter(slug=candidate).exists():
            candidate = f"{slug}-{n}"
            n += 1
        return candidate

    def create(self, validated_data):
        title = validated_data.get("title", "")
        validated_data["slug"] = self._unique_slug(title)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        new_title = validated_data.get("title", instance.title)
        if new_title != instance.title:
            validated_data["slug"] = self._unique_slug(
                new_title,
                instance_pk=instance.pk,
            )
        return super().update(instance, validated_data)

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative")
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source="product.title", read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_title", "quantity", "price")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(source="orderitem_set", many=True, read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "user",
            "user_email",
            "items",
            "total_price",
            "status",
            "created_at",
        )
        read_only_fields = ("id", "user", "created_at")
