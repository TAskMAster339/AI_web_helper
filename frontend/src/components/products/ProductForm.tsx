import { useEffect, useState } from 'react';
import type { Category, Product } from '../../types/product';

interface FormValues {
  title: string;
  description: string;
  price: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  stock: string;
}

interface Props {
  initial?: Partial<Product>;
  categories: Category[];
  isSaving: boolean;
  saveError: string | null;
  onSubmit: (data: Partial<Product>) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

interface FieldErrors {
  title?: string;
  description?: string;
  price?: string;
  category?: string;
  stock?: string;
}

export default function ProductForm({
  initial,
  categories,
  isSaving,
  saveError,
  onSubmit,
  onCancel,
  submitLabel = 'Сохранить',
}: Props) {
  const [values, setValues] = useState<FormValues>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    price: initial?.price ?? '',
    category: initial?.category ? String(initial.category) : '',
    status: initial?.status ?? 'draft',
    stock: initial?.stock != null ? String(initial.stock) : '0',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (initial) {
      setValues({
        title: initial.title ?? '',
        description: initial.description ?? '',
        price: initial.price ?? '',
        category: initial.category ? String(initial.category) : '',
        status: initial.status ?? 'draft',
        stock: initial.stock != null ? String(initial.stock) : '0',
      });
    }
  }, [initial?.slug]);

  const set =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
    };

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (!values.title.trim()) errs.title = 'Название обязательно';
    if (values.title.length > 200) errs.title = 'Максимум 200 символов';
    if (!values.description.trim()) errs.description = 'Описание обязательно';
    const price = parseFloat(values.price);
    if (isNaN(price) || price < 0) errs.price = 'Введите корректную цену (≥ 0)';
    if (!values.category) errs.category = 'Выберите категорию';
    const stock = parseInt(values.stock, 10);
    if (isNaN(stock) || stock < 0) errs.stock = 'Остаток должен быть ≥ 0';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      price: values.price,
      category: Number(values.category),
      status: values.status,
      stock: Number(values.stock),
    });
  };

  const errBorder = { borderColor: 'var(--error)' } as React.CSSProperties;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {saveError && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            background: 'var(--error-soft)',
            border: '1px solid var(--error)',
            color: 'var(--error)',
          }}
        >
          {saveError}
        </div>
      )}

      {/* Title */}
      <div>
        <label
          htmlFor="product-title"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Название <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <input
          id="product-title"
          type="text"
          value={values.title}
          onChange={set('title')}
          placeholder="Введите название товара"
          style={fieldErrors.title ? errBorder : undefined}
        />
        {fieldErrors.title && (
          <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
            {fieldErrors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="product-description"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Описание <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <textarea
          id="product-description"
          value={values.description}
          onChange={set('description')}
          rows={4}
          placeholder="Подробное описание товара"
          className="resize-y"
          style={fieldErrors.description ? errBorder : undefined}
        />
        {fieldErrors.description && (
          <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
            {fieldErrors.description}
          </p>
        )}
      </div>

      {/* Price + Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="product-price"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Цена (₽) <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            id="product-price"
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={set('price')}
            placeholder="0.00"
            style={fieldErrors.price ? errBorder : undefined}
          />
          {fieldErrors.price && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
              {fieldErrors.price}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="product-stock"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Остаток (шт.)
          </label>
          <input
            id="product-stock"
            type="number"
            min="0"
            value={values.stock}
            onChange={set('stock')}
            placeholder="0"
            style={fieldErrors.stock ? errBorder : undefined}
          />
          {fieldErrors.stock && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
              {fieldErrors.stock}
            </p>
          )}
        </div>
      </div>

      {/* Category + Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="product-category"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Категория <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <select
            id="product-category"
            value={values.category}
            onChange={set('category')}
            style={fieldErrors.category ? errBorder : undefined}
          >
            <option value="">Выберите...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
              {fieldErrors.category}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="product-status"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Статус
          </label>
          <select id="product-status" value={values.status} onChange={set('status')}>
            <option value="draft">Черновик</option>
            <option value="published">Опубликован</option>
            <option value="archived">Архив</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary flex-1 py-2.5 text-sm rounded-lg"
        >
          {isSaving ? 'Сохранение...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="btn-ghost px-5 py-2.5 text-sm rounded-lg"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
