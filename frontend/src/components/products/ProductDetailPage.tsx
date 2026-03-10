import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../../api/productApi';
import { useAuthStore } from '../../store/authStore';
import { useProductStore } from '../../store/productStore';
import type { Product, ProductImage } from '../../types/product';
import GlassConfirmModal from '../GlassConfirmModal';
import ImageManager from './ImageManager';

const STATUS_LABELS: Record<string, string> = {
  published: 'Опубликован',
  draft: 'Черновик',
  archived: 'Архив',
};

function statusStyle(status: string) {
  if (status === 'published') return { background: 'var(--success-soft)', color: 'var(--success)' };
  if (status === 'draft') return { background: 'var(--warning-soft)', color: 'var(--warning)' };
  return { background: 'var(--bg-surface)', color: 'var(--text-muted)' };
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { deleteProduct } = useProductStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    if (!product) return;
    await deleteProduct(product.slug);
    navigate('/products');
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="h-8 w-1/2 rounded" style={{ background: 'var(--bg-surface)' }} />
        <div className="h-64 rounded-xl" style={{ background: 'var(--bg-surface)' }} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-lg" style={{ color: 'var(--error)' }}>
          {error ?? 'Товар не найден'}
        </p>
        <Link
          to="/products"
          className="mt-4 inline-block text-sm font-medium"
          style={{ color: 'var(--accent)' }}
        >
          ← Вернуться в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <Link
          to="/products"
          className="transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Каталог
        </Link>
        <span>/</span>
        <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {product.title}
        </span>
      </div>

      {/* Main card */}
      <div className="glass p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {product.title}
            </h1>
            <div
              className="flex items-center gap-2 mt-2 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>{product.category_name} · от</span>
              <Link
                to={`/users/${product.author.id}`}
                className="flex items-center gap-1.5 group/author"
                title="Профиль пользователя"
              >
                <div
                  className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: product.author.avatar_url
                      ? 'var(--accent-soft)'
                      : 'var(--avatar-placeholder-bg)',
                    color: product.author.avatar_url
                      ? 'var(--accent)'
                      : 'var(--avatar-placeholder-color)',
                  }}
                >
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
                <span
                  className="font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {product.author.full_name || product.author.username}
                </span>
              </Link>
            </div>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
            style={statusStyle(product.status)}
          >
            {STATUS_LABELS[product.status]}
          </span>
        </div>

        <p className="leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
          {product.description}
        </p>

        {/* Stats row */}
        <div
          className="grid grid-cols-3 gap-4 p-4 rounded-xl mb-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
              {Number(product.price).toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Цена
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {product.stock}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              В наличии
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {images.length}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Фото
            </div>
          </div>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex gap-3">
            <Link
              to={`/products/${product.slug}/edit`}
              className="btn-primary px-4 py-2 text-sm rounded-lg"
            >
              Редактировать
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-danger-ghost px-4 py-2 text-sm font-semibold rounded-lg"
            >
              Удалить товар
            </button>
          </div>
        )}
      </div>

      {/* Image manager */}
      <div className="glass p-6">
        <ImageManager
          slug={product.slug}
          images={images}
          canManage={canManage}
          onImagesChange={setImages}
        />
      </div>

      {/* Delete confirmation modal */}
      <GlassConfirmModal
        open={showDeleteConfirm}
        title="Удалить товар?"
        message={`Товар «${product.title}» будет удалён без возможности восстановления.`}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        icon="🗑️"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
