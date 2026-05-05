import { useEffect, useRef, useState } from 'react';
import type { Category, ProductFilters } from '../../types/product';
interface Props {
  filters: ProductFilters;
  categories: Category[];
  onFilterChange: (key: keyof ProductFilters, value: string) => void;
  onReset: () => void;
}

const DEBOUNCE_MS = 500;

export default function ProductFiltersBar({ filters, categories, onFilterChange, onReset }: Props) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [minPrice, setMinPrice] = useState(filters.min_price ?? '');
  const [maxPrice, setMaxPrice] = useState(filters.max_price ?? '');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearch(filters.search ?? '');
  }, [filters.search]);
  useEffect(() => {
    setMinPrice(filters.min_price ?? '');
  }, [filters.min_price]);
  useEffect(() => {
    setMaxPrice(filters.max_price ?? '');
  }, [filters.max_price]);

  const debounced = (
    timer: React.RefObject<ReturnType<typeof setTimeout> | null>,
    key: keyof ProductFilters,
    val: string
  ) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onFilterChange(key, val), DEBOUNCE_MS);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    debounced(searchTimer, 'search', val);
  };
  const handleMinPrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMinPrice(val);
    debounced(minTimer, 'min_price', val);
  };
  const handleMaxPrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMaxPrice(val);
    debounced(maxTimer, 'max_price', val);
  };

  return (
    <div className="glass p-4 mb-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="lg:col-span-2">
          <label
            className="block text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Поиск
          </label>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Название или описание..."
          />
        </div>

        {/* Category */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Категория
          </label>
          <select
            value={filters.category ?? ''}
            onChange={(e) => onFilterChange('category', e.target.value)}
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Статус
          </label>
          <select
            value={filters.status ?? ''}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="">Любой статус</option>
            <option value="published">Опубликован</option>
            <option value="draft">Черновик</option>
            <option value="archived">Архив</option>
          </select>
        </div>

        {/* Min price */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Цена от
          </label>
          <input type="number" min="0" value={minPrice} onChange={handleMinPrice} placeholder="0" />
        </div>

        {/* Max price */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Цена до
          </label>
          <input type="number" min="0" value={maxPrice} onChange={handleMaxPrice} placeholder="∞" />
        </div>

        {/* In stock */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Наличие
          </label>
          <select
            value={filters.in_stock ?? ''}
            onChange={(e) => onFilterChange('in_stock', e.target.value)}
          >
            <option value="">Все</option>
            <option value="true">В наличии</option>
            <option value="false">Нет в наличии</option>
          </select>
        </div>

        {/* Sorting */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Сортировка
          </label>
          <select
            value={filters.ordering ?? ''}
            onChange={(e) => onFilterChange('ordering', e.target.value)}
          >
            <option value="-created_at">Сначала новые</option>
            <option value="created_at">Сначала старые</option>
            <option value="price">Цена: по возрастанию</option>
            <option value="-price">Цена: по убыванию</option>
            <option value="title">Название: А–Я</option>
            <option value="-title">Название: Я–А</option>
            <option value="-stock">Остаток: по убыванию</option>
          </select>
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <button onClick={onReset} className="btn-ghost text-sm px-4 py-1.5 rounded-lg">
          Сбросить фильтры
        </button>
      </div>
    </div>
  );
}
