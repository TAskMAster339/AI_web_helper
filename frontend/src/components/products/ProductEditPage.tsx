import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../../api/productApi';
import { useAuthStore } from '../../store/authStore';
import { useProductStore } from '../../store/productStore';
import type { Product } from '../../types/product';
import ProductForm from './ProductForm';

export default function ProductEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { categories, fetchCategories, updateProduct, isSaving, saveError } = useProductStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    if (!slug) return;
    productApi
      .get(slug)
      .then((p) => {
        const isAdmin = user?.profile?.role === 'admin';
        if (p.author.id !== user?.id && !isAdmin) {
          navigate(`/products/${slug}`);
          return;
        }
        setProduct(p);
      })
      .catch(() => setLoadError('Товар не найден'));
  }, [slug]);

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p style={{ color: 'var(--error)' }}>{loadError}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div
          className="h-8 w-1/3 rounded animate-pulse mb-6"
          style={{ background: 'var(--bg-surface)' }}
        />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded animate-pulse"
              style={{ background: 'var(--bg-surface)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: Partial<Product>) => {
    const updated = await updateProduct(product.slug, data);
    navigate(`/products/${updated.slug}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        Редактировать товар
      </h1>
      <div className="glass p-6">
        <ProductForm
          initial={product}
          categories={categories}
          isSaving={isSaving}
          saveError={saveError}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/products/${product.slug}`)}
          submitLabel="Сохранить изменения"
        />
      </div>
    </div>
  );
}
