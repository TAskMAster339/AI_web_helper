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
  // Local controlled state — all three debounced fields
  const [search, setSearch] = useState(filters.search ?? '');
  const [minPrice, setMinPrice] = useState(filters.min_price ?? '');
  const [maxPrice, setMaxPrice] = useState(filters.max_price ?? '');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when URL changes externally (e.g. reset)
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

  const inputCls =
    'w-full py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg ' +
    'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Поиск
          </label>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Название или описание..."
            className={inputCls}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Категория
          </label>
          <select
            value={filters.category ?? ''}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className={inputCls}
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
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Статус
          </label>
          <select
            value={filters.status ?? ''}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className={inputCls}
          >
            <option value="">Любой статус</option>
            <option value="published">Опубликован</option>
            <option value="draft">Черновик</option>
            <option value="archived">Архив</option>
          </select>
        </div>

        {/* Min price */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Цена от
          </label>
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={handleMinPrice}
            placeholder="0"
            className={inputCls}
          />
        </div>

        {/* Max price */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Цена до
          </label>
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={handleMaxPrice}
            placeholder="∞"
            className={inputCls}
          />
        </div>

        {/* In stock */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Наличие
          </label>
          <select
            value={filters.in_stock ?? ''}
            onChange={(e) => onFilterChange('in_stock', e.target.value)}
            className={inputCls}
          >
            <option value="">Все</option>
            <option value="true">В наличии</option>
            <option value="false">Нет в наличии</option>
          </select>
        </div>

        {/* Sorting */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            Сортировка
          </label>
          <select
            value={filters.ordering ?? ''}
            onChange={(e) => onFilterChange('ordering', e.target.value)}
            className={inputCls}
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
        <button
          onClick={onReset}
          className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          Сбросить фильтры
        </button>
      </div>
    </div>
  );
}
