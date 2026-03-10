export interface ProductImage {
  id: number;
  original_filename: string;
  content_type: string;
  file_size: number;
  url: string | null;
  uploaded_by_username: string;
  created_at: string;
}

export interface Product {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: string;
  category: number;
  category_name: string;
  author: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    avatar_url: string | null;
  };
  status: 'draft' | 'published' | 'archived';
  stock: number;
  images: ProductImage[];
  images_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProductFilters {
  search?: string;
  status?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
  in_stock?: string;
  ordering?: string;
  page?: string;
}
