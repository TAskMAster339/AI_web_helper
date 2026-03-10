import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useProductStore } from '../../store/productStore';
import type { Product } from '../../types/product';
import ProductForm from './ProductForm';

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { categories, fetchCategories, createProduct, isSaving, saveError } = useProductStore();

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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Новый товар</h1>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
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
