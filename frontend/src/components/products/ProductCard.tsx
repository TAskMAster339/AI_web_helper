import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';

interface Props {
  product: Product;
  currentUserId?: number;
  onDelete?: (slug: string) => void;
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  published: {
    label: 'Опубликован',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  draft: {
    label: 'Черновик',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  archived: {
    label: 'Архив',
    cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  },
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
    <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col">
      {/* ── Cover image ── */}
      <Link
        to={`/products/${product.slug}`}
        className="block relative h-48 bg-gray-50 dark:bg-gray-700 overflow-hidden flex-shrink-0"
      >
        {cover ? (
          <img
            src={cover}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300 dark:text-gray-600">
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
        {/* Status badge — pinned top-right over image */}
        <span
          className={`absolute top-2.5 right-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm ${status.cls}`}
        >
          {status.label}
        </span>
      </Link>

      {/* ── Body ── */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Category */}
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide truncate">
          {product.category_name}
        </p>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* ── Author ── */}
        <Link
          to={`/users/${product.author.id}`}
          className="flex items-center gap-2 mt-1 group/author w-fit"
          title={`Профиль: ${authorName}`}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-300">
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
          <span className="text-xs text-gray-500 dark:text-gray-400 group-hover/author:text-blue-600 dark:group-hover/author:text-blue-400 transition-colors truncate max-w-[120px]">
            {authorName}
          </span>
        </Link>

        {/* ── Footer ── */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-end justify-between gap-3">
          {/* Price + stock */}
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
              {price}{' '}
              <span className="text-base font-normal text-gray-500 dark:text-gray-400">₽</span>
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Link
              to={`/products/${product.slug}`}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
            >
              Открыть
            </Link>

            {isOwner && (
              <>
                <Link
                  to={`/products/${product.slug}/edit`}
                  title="Редактировать"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </Link>
                <button
                  onClick={() => onDelete?.(product.slug)}
                  title="Удалить"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
