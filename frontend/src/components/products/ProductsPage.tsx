import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { useAuthStore } from '../../store/authStore';
import { useProductStore } from '../../store/productStore';
import type { ProductFilters } from '../../types/product';
import GlassConfirmModal from '../GlassConfirmModal';
import Pagination from './Pagination';
import ProductCard from './ProductCard';
import ProductFiltersBar from './ProductFiltersBar';

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  useSEO({
    title: 'Каталог товаров',
    description:
      'Просматривайте каталог товаров AI Web Helper. Фильтрация по категориям, цене и наличию.',
  });

  // Select each piece individually so we get stable references
  const products = useProductStore((s) => s.products);
  const totalCount = useProductStore((s) => s.totalCount);
  const isLoading = useProductStore((s) => s.isLoading);
  const error = useProductStore((s) => s.error);
  const categories = useProductStore((s) => s.categories);
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const fetchCategories = useProductStore((s) => s.fetchCategories);
  const deleteProduct = useProductStore((s) => s.deleteProduct);

  // Read filters from URL
  const filters: ProductFilters = {
    search: searchParams.get('search') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    category_name: searchParams.get('category_name') ?? undefined,
    min_price: searchParams.get('min_price') ?? undefined,
    max_price: searchParams.get('max_price') ?? undefined,
    in_stock: searchParams.get('in_stock') ?? undefined,
    ordering: searchParams.get('ordering') ?? '-created_at',
    page: searchParams.get('page') ?? '1',
  };

  const page = Number(filters.page ?? '1');

  // Load categories once (guard is inside the store action)
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Serialize URL params once per render — stable primitive dep for the fetch effect.
  const searchParamsString = searchParams.toString();

  // Track whether we are waiting for categories to resolve a `category_name` param.
  // When true the fetch effect is suppressed; after resolution the URL changes →
  // searchParamsString changes → fetch effect runs cleanly with the resolved `category` id.
  const categoryNamePendingRef = useRef(false);

  // Effect 1 — category_name resolver.
  // Runs only when categories load or the URL changes, converts category_name → id in the URL.
  // Does NOT call fetchProducts — the URL change will trigger Effect 2.
  useEffect(() => {
    const categoryName = searchParams.get('category_name');
    if (!categoryName) {
      categoryNamePendingRef.current = false;
      return;
    }
    // Categories not yet loaded — mark as pending and wait for the next run.
    if (categories.length === 0) {
      categoryNamePendingRef.current = true;
      return;
    }
    const needle = categoryName.toLowerCase();
    const match =
      categories.find((c) => c.name.toLowerCase() === needle) ??
      categories.find((c) => c.name.toLowerCase().includes(needle));

    categoryNamePendingRef.current = false;

    if (match) {
      // Swap category_name → category id in the URL (replace so no extra history entry).
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('category_name');
          next.set('category', String(match.id));
          return next;
        },
        { replace: true }
      );
      // fetchProducts will fire via Effect 2 once the URL updates.
    } else {
      // Name not found — remove the unresolvable param and fetch without it.
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('category_name');
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParamsString, categories, setSearchParams]);

  // Effect 2 — products fetcher.
  // Depends only on the serialised URL string, NOT on categories.
  // Suppressed while category_name resolution is in progress.
  useEffect(() => {
    // Skip if we're still waiting for category_name → id resolution.
    if (categoryNamePendingRef.current || searchParams.get('category_name')) return;

    const clean: ProductFilters = {};
    (Object.keys(filters) as (keyof ProductFilters)[]).forEach((k) => {
      if (filters[k]) clean[k] = filters[k];
    });
    delete clean.category_name; // never a real API param

    fetchProducts(clean);
  }, [searchParamsString, fetchProducts]);

  const handleFilterChange = useCallback(
    (key: keyof ProductFilters, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        next.set('page', '1'); // reset to first page on filter change
        return next;
      });
    },
    [setSearchParams]
  );

  const handleReset = useCallback(() => {
    setSearchParams({ ordering: '-created_at', page: '1' });
  }, [setSearchParams]);

  const handlePageChange = useCallback(
    (p: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(p));
        return next;
      });
    },
    [setSearchParams]
  );

  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const handleDelete = useCallback((slug: string) => {
    setDeleteSlug(slug);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteSlug) return;
    await deleteProduct(deleteSlug);
    setDeleteSlug(null);
  }, [deleteSlug, deleteProduct]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Каталог товаров
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Найдено: {totalCount} товаров
          </p>
        </div>
        {user && (
          <Link
            to="/products/new"
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Создать товар
          </Link>
        )}
      </div>

      {/* Filters */}
      <ProductFiltersBar
        filters={filters}
        categories={categories}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-xl mb-6 text-sm"
          style={{
            background: 'var(--error-soft)',
            border: '1px solid var(--error)',
            color: 'var(--error)',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-xl animate-pulse"
              style={{ background: 'var(--bg-surface)' }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && products.length === 0 && (
        <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-lg font-medium">Товары не найдены</p>
          <p className="text-sm mt-1">Попробуйте изменить параметры поиска</p>
        </div>
      )}

      {/* Products grid */}
      {!isLoading && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currentUserId={user?.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
      />

      {/* Delete confirmation modal */}
      <GlassConfirmModal
        open={deleteSlug !== null}
        title="Удалить товар?"
        message="Товар будет удалён без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        icon="🗑️"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteSlug(null)}
      />
    </div>
  );
}
