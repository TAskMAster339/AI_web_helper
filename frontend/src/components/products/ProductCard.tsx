import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';

interface Props {
  product: Product;
  currentUserId?: number;
  onDelete?: (slug: string) => void;
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  published: { label: 'Опубликован', bg: 'var(--success-soft)', color: 'var(--success)' },
  draft: { label: 'Черновик', bg: 'var(--warning-soft)', color: 'var(--warning)' },
  archived: { label: 'Архив', bg: 'var(--bg-surface)', color: 'var(--text-muted)' },
};

export default function ProductCard({ product, currentUserId, onDelete }: Props) {
  const isOwner = currentUserId === product.author.id;
  const cover = product.images?.[0]?.url;
  const status = STATUS_CFG[product.status] ?? STATUS_CFG.draft;
  const price = Number(product.price).toLocaleString('ru-RU');

  const authorName = product.author.full_name || product.author.username;
  const authorInitials =
    [product.author.first_name, product.author.last_name]
      .filter(Boolean)
      .map((s) => s[0].toUpperCase())
      .join('') ||
    product.author.username[0]?.toUpperCase() ||
    '?';

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group product-card overflow-hidden flex flex-col"
      style={{ textDecoration: 'none' }}
    >
      {/* ── Cover image ── */}
      <div
        className="relative h-48 overflow-hidden flex-shrink-0"
        style={{ background: 'var(--bg-surface)' }}
      >
        {cover ? (
          <img
            src={cover}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Нет фото</span>
          </div>
        )}

        {/* Specular shine on image top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
          }}
        />

        {/* Owner actions — float over image */}
        {isOwner && (
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(e) => e.preventDefault()}
          >
            <Link
              to={`/products/${product.slug}/edit`}
              title="Редактировать"
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(8px)',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(product.slug);
              }}
              title="Удалить"
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(8px)',
                color: 'var(--error)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Category */}
        <p
          className="text-xs font-semibold uppercase tracking-wider truncate"
          style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}
        >
          {product.category_name}
        </p>

        {/* Title */}
        <h3
          className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem]"
          style={{ color: 'var(--text-primary)' }}
        >
          {product.title}
        </h3>

        {/* Description */}
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {product.description}
        </p>

        {/* ── Author ── */}
        <span className="flex items-center gap-2 mt-1 w-fit" onClick={(e) => e.preventDefault()}>
          <Link
            to={`/users/${product.author.id}`}
            className="flex items-center gap-2 group/author"
            title={`Профиль: ${authorName}`}
            onClick={(e) => e.stopPropagation()}
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
                  alt={authorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{authorInitials}</span>
              )}
            </div>
            <span
              className="text-xs transition-colors truncate max-w-[120px] group-hover/author:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              {authorName}
            </span>
          </Link>
        </span>

        {/* ── Footer ── */}
        <div
          className="mt-auto pt-3 flex items-end justify-between gap-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* Price + stock */}
          <div className="flex flex-col min-w-0 flex-shrink">
            <span
              className="text-xl font-bold leading-none"
              style={{ color: 'var(--text-primary)' }}
            >
              {price}{' '}
              <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>
                ₽
              </span>
            </span>
            <span className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
              {product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
            </span>
          </div>

          {/* Status badge — moved here from image overlay */}
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              background: status.bg,
              color: status.color,
              border: `1px solid ${status.color}22`,
              backdropFilter: 'blur(4px)',
            }}
          >
            {status.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
