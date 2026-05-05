import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { useAuthStore } from '../../store/authStore';
import { useProductStore } from '../../store/productStore';
import type { Product } from '../../types/product';
import ProductForm from './ProductForm';

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { categories, fetchCategories, createProduct, isSaving, saveError } = useProductStore();

  useSEO({ title: 'Новый товар', description: 'Создать новый товар в каталоге.', noIndex: true });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchCategories();
  }, [user]);

  const handleSubmit = async (data: Partial<Product>) => {
    const product = await createProduct(data);
    navigate(`/products/${product.slug}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        Новый товар
      </h1>
      <div className="glass p-6">
        <ProductForm
          categories={categories}
          isSaving={isSaving}
          saveError={saveError}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/products')}
          submitLabel="Создать товар"
        />
      </div>
    </div>
  );
}
