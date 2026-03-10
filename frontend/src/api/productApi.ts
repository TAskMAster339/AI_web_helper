import type {
  Category,
  PaginatedResponse,
  Product,
  ProductFilters,
  ProductImage,
} from '../types/product';
import api from './axios';

export const productApi = {
  // ── Products ──────────────────────────────────────────────────────────────

  async list(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, v);
    });
    const r = await api.get<PaginatedResponse<Product>>(`/products/?${params}`);
    return r.data;
  },

  async get(slug: string): Promise<Product> {
    const r = await api.get<Product>(`/products/${slug}/`);
    return r.data;
  },

  async create(data: Partial<Product>): Promise<Product> {
    const r = await api.post<Product>('/products/', data);
    return r.data;
  },

  async update(slug: string, data: Partial<Product>): Promise<Product> {
    const r = await api.patch<Product>(`/products/${slug}/`, data);
    return r.data;
  },

  async delete(slug: string): Promise<void> {
    await api.delete(`/products/${slug}/`);
    return undefined;
  },

  async myProducts(page = 1): Promise<PaginatedResponse<Product>> {
    const r = await api.get<PaginatedResponse<Product>>(`/products/my/?page=${page}`);
    return r.data;
  },

  // ── Categories ────────────────────────────────────────────────────────────

  async listCategories(): Promise<Category[]> {
    const r = await api.get<Category[]>('/categories/');
    return Array.isArray(r.data) ? r.data : (r.data as PaginatedResponse<Category>).results;
    // DRF may return paginated or plain array
  },

  // ── Images ────────────────────────────────────────────────────────────────

  async listImages(slug: string): Promise<ProductImage[]> {
    const r = await api.get<ProductImage[]>(`/products/${slug}/images/`);
    return r.data;
  },

  async uploadImage(slug: string, file: File): Promise<ProductImage> {
    const form = new FormData();
    form.append('file', file);
    const r = await api.post<ProductImage>(`/products/${slug}/images/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  },

  async deleteImage(slug: string, imageId: number): Promise<void> {
    await api.delete(`/products/${slug}/images/${imageId}/`);
    return undefined;
  },

  async getPresignedUrl(
    slug: string,
    imageId: number
  ): Promise<{ url: string; expires_in: number }> {
    const r = await api.get<{ url: string; expires_in: number }>(
      `/products/${slug}/images/${imageId}/`
    );
    return r.data;
  },
};
