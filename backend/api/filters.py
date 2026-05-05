import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    status = django_filters.ChoiceFilter(choices=Product.STATUS_CHOICES)
    category = django_filters.NumberFilter(field_name="category__id")
    in_stock = django_filters.BooleanFilter(
        field_name="stock",
        method="filter_in_stock",
    )

    class Meta:
        model = Product
        fields = ("min_price", "max_price", "status", "category", "in_stock")

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset.filter(stock=0)
