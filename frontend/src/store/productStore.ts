import { create } from 'zustand';
import { productApi } from '../api/productApi';
import type { Category, PaginatedResponse, Product, ProductFilters } from '../types/product';

interface ProductStore {
  // List state
  products: Product[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  // Categories
  categories: Category[];
  categoriesLoaded: boolean;

  // CRUD state
  isSaving: boolean;
  saveError: string | null;

  // Actions
  fetchProducts: (filters: ProductFilters) => Promise<void>;
  fetchCategories: () => Promise<void>;
  createProduct: (data: Partial<Product>) => Promise<Product>;
  updateProduct: (slug: string, data: Partial<Product>) => Promise<Product>;
  deleteProduct: (slug: string) => Promise<void>;
  clearError: () => void;
}

// In-flight request key for fetchProducts deduplication.
// Prevents duplicate API calls when multiple effects fire in the same tick.
let productsInFlightKey: string | null = null;

// Flag set synchronously before the categories request starts so that concurrent
// callers (StrictMode double-invoke, multiple components) don't fire a second request
// while the first one is still in-flight. Unlike categoriesLoaded (which is only set
// after the response arrives), this flag blocks duplicates immediately.
let categoriesInFlight = false;

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  totalCount: 0,
  isLoading: false,
  error: null,
  categories: [],
  categoriesLoaded: false,
  isSaving: false,
  saveError: null,

  fetchProducts: async (filters) => {
    const key = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString();
    if (productsInFlightKey === key) return;
    productsInFlightKey = key;

    set({ isLoading: true, error: null });
    try {
      const data: PaginatedResponse<Product> = await productApi.list(filters);
      set({ products: data.results, totalCount: data.count, isLoading: false });
    } catch {
      set({ error: 'Ошибка загрузки товаров', isLoading: false });
    } finally {
      productsInFlightKey = null;
    }
  },

  fetchCategories: async () => {
    if (get().categoriesLoaded || categoriesInFlight) return;
    categoriesInFlight = true;
    try {
      const cats = await productApi.listCategories();
      set({ categories: cats, categoriesLoaded: true });
    } catch {
      // non-critical — allow retry next time
      categoriesInFlight = false;
    }
  },

  createProduct: async (data) => {
    set({ isSaving: true, saveError: null });
    try {
      const product = await productApi.create(data);
      set((s) => ({ products: [product, ...s.products], isSaving: false }));
      return product;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) || 'Ошибка создания товара';
      set({ saveError: msg, isSaving: false });
      throw err;
    }
  },

  updateProduct: async (slug, data) => {
    set({ isSaving: true, saveError: null });
    try {
      const updated = await productApi.update(slug, data);
      set((s) => ({
        products: s.products.map((p) => (p.slug === slug ? updated : p)),
        isSaving: false,
      }));
      return updated;
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) || 'Ошибка обновления товара';
      set({ saveError: msg, isSaving: false });
      throw err;
    }
  },

  deleteProduct: async (slug) => {
    try {
      await productApi.delete(slug);
      set((s) => ({ products: s.products.filter((p) => p.slug !== slug) }));
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) || 'Ошибка удаления товара';
      set({ error: msg });
      throw err;
    }
  },

  clearError: () => set({ error: null, saveError: null }),
}));

function extractErrorMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { detail?: string } } }).response;
    return resp?.data?.detail ?? null;
  }
  return null;
}
