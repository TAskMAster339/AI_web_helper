import { useCallback, useEffect, useRef, useState } from 'react';
import { productApi } from '../../api/productApi';
import type { ProductImage } from '../../types/product';

interface Props {
  slug: string;
  images: ProductImage[];
  canManage: boolean;
  onImagesChange: (images: ProductImage[]) => void;
}

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function ImageManager({ slug, images, canManage, onImagesChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // lightbox state: index into images array (null = closed)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError(`Недопустимый тип файла. Разрешены: JPEG, PNG, GIF, WEBP`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploadError(`Файл слишком большой. Максимум: ${MAX_SIZE_MB} MB`);
        return;
      }

      setUploadError(null);
      setUploading(true);
      try {
        const image = await productApi.uploadImage(slug, file);
        onImagesChange([image, ...images]);
      } catch (err: unknown) {
        const detail =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
        setUploadError(typeof detail === 'string' ? detail : 'Ошибка загрузки файла');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [slug, images, onImagesChange]
  );
  const handleDelete = useCallback(
    async (imageId: number) => {
      if (!confirm('Удалить изображение?')) return;
      setDeletingId(imageId);
      try {
        await productApi.deleteImage(slug, imageId);
        // If the deleted image was open in lightbox — close or shift index
        setLightboxIndex((prev) => {
          if (prev === null) return null;
          const newLen = images.length - 1;
          if (newLen === 0) return null;
          return Math.min(prev, newLen - 1);
        });
        onImagesChange(images.filter((img) => img.id !== imageId));
      } catch {
        alert('Ошибка удаления изображения');
      } finally {
        setDeletingId(null);
      }
    },
    [slug, images, onImagesChange]
  );

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
        setZoomed(false);
      }
      if (e.key === 'ArrowRight')
        setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));
      if (e.key === 'ArrowLeft')
        setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, images.length]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setZoomed(false);
  };
  const closeLightbox = () => {
    setLightboxIndex(null);
    setZoomed(false);
  };
  const prev = () => {
    setZoomed(false);
    setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  };
  const next = () => {
    setZoomed(false);
    setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Изображения ({images.length})
        </h3>
        {canManage && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Загрузка...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Загрузить фото
                </>
              )}
            </button>
          </div>
        )}
      </div>
      {uploadError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {uploadError}
        </div>
      )}
      {/* Hint */}
      {canManage && (
        <p className="text-xs text-gray-400">
          Допустимые форматы: JPEG, PNG, GIF, WEBP. Максимальный размер: {MAX_SIZE_MB} MB.
        </p>
      )}{' '}
      {/* Gallery */}
      {images.length === 0 ? (
        <div className="py-10 text-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <svg
            className="w-10 h-10 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Нет изображений
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700"
            >
              {img.url ? (
                <img
                  src={img.url}
                  alt={img.original_filename}
                  className="w-full h-32 object-cover cursor-zoom-in"
                  onClick={() => openLightbox(index)}
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center text-gray-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v3m0 0v3m0-3h3m-3 0H9"
                    />
                  </svg>
                </div>
              )}

              {/* Overlay buttons */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                {img.url && (
                  <button
                    onClick={() => openLightbox(index)}
                    className="text-xs px-3 py-1 bg-white/90 text-gray-800 rounded-md hover:bg-white transition flex items-center gap-1"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                    Открыть
                  </button>
                )}
                {img.url && (
                  <a
                    href={img.url}
                    download={img.original_filename}
                    className="text-xs px-3 py-1 bg-white/90 text-gray-800 rounded-md hover:bg-white transition"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Скачать
                  </a>
                )}
                {canManage && (
                  <button
                    onClick={() => handleDelete(img.id)}
                    disabled={deletingId === img.id}
                    className="text-xs px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    {deletingId === img.id ? 'Удаление...' : 'Удалить'}
                  </button>
                )}
              </div>

              {/* Filename */}
              <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                {img.original_filename}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* ── Lightbox ── */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm select-none">
            {lightboxIndex + 1} / {images.length}
          </div>

          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            onClick={closeLightbox}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Image */}
          <img
            src={images[lightboxIndex].url ?? ''}
            alt={images[lightboxIndex].original_filename}
            className={`max-h-[85vh] max-w-[90vw] rounded-lg object-contain select-none transition-transform duration-200 ${
              zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setZoomed((z) => !z);
            }}
          />

          {/* Next */}
          {images.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Bottom bar: filename + download */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 px-4 py-2 rounded-full">
            <span className="text-white/80 text-sm truncate max-w-xs">
              {images[lightboxIndex].original_filename}
            </span>
            {images[lightboxIndex].url && (
              <a
                href={images[lightboxIndex].url}
                download={images[lightboxIndex].original_filename}
                onClick={(e) => e.stopPropagation()}
                className="text-white/70 hover:text-white transition"
                title="Скачать"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </a>
            )}
          </div>

          {/* Thumbnail strip (when > 1 image) */}
          {images.length > 1 && (
            <div
              className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 px-2"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => {
                    setZoomed(false);
                    setLightboxIndex(i);
                  }}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition flex-shrink-0 ${
                    i === lightboxIndex
                      ? 'border-white'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  {img.url && <img src={img.url} alt="" className="w-full h-full object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
