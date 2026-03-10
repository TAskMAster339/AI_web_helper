import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../../api/productApi';
import { useAuthStore } from '../../store/authStore';
import { useProductStore } from '../../store/productStore';
import type { Product, ProductImage } from '../../types/product';
import ImageManager from './ImageManager';

const STATUS_LABELS: Record<string, string> = {
  published: 'Опубликован',
  draft: 'Черновик',
  archived: 'Архив',
};

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { deleteProduct } = useProductStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    productApi
      .get(slug)
      .then((p) => {
        setProduct(p);
        setImages(p.images ?? []);
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        setError(detail ?? 'Товар не найден');
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  const isOwner = user?.id === product?.author.id;
  const isAdmin = user?.profile?.role === 'admin';
  const canManage = isOwner || isAdmin;

  const handleDelete = async () => {
    if (!product || !confirm('Удалить товар?')) return;
    await deleteProduct(product.slug);
    navigate('/products');
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="h-8 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-lg">{error ?? 'Товар не найден'}</p>
        <Link to="/products" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Вернуться в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link to="/products" className="hover:text-blue-600 transition">
          Каталог
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium truncate">
          {product.title}
        </span>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6 shadow-sm">
        {' '}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{product.category_name} · от</span>
              <Link
                to={`/users/${product.author.id}`}
                className="flex items-center gap-1.5 group/author"
                title={`Профиль пользователя`}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-300">
                  {product.author.avatar_url ? (
                    <img
                      src={product.author.avatar_url}
                      alt={product.author.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {[product.author.first_name, product.author.last_name]
                        .filter(Boolean)
                        .map((s) => s[0].toUpperCase())
                        .join('') || product.author.username[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300 group-hover/author:text-blue-600 dark:group-hover/author:text-blue-400 transition-colors">
                  {product.author.full_name || product.author.username}
                </span>
              </Link>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${
              product.status === 'published'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : product.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {STATUS_LABELS[product.status]}
          </span>
        </div>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-5">
          {product.description}
        </p>
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-5">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {Number(product.price).toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Цена</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {product.stock}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">В наличии</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {images.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Фото</div>
          </div>
        </div>
        {/* Actions */}
        {canManage && (
          <div className="flex gap-3">
            <Link
              to={`/products/${product.slug}/edit`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
            >
              Редактировать
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold rounded-lg transition"
            >
              Удалить товар
            </button>
          </div>
        )}
      </div>

      {/* Image manager */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
        <ImageManager
          slug={product.slug}
          images={images}
          canManage={canManage}
          onImagesChange={setImages}
        />
      </div>
    </div>
  );
}
