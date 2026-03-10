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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {saveError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {saveError}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Название <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.title}
          onChange={set('title')}
          placeholder="Введите название товара"
          className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.title ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Описание <span className="text-red-500">*</span>
        </label>
        <textarea
          value={values.description}
          onChange={set('description')}
          rows={4}
          placeholder="Подробное описание товара"
          className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${fieldErrors.description ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {fieldErrors.description && (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>
        )}
      </div>

      {/* Price + Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Цена (₽) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={set('price')}
            placeholder="0.00"
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.price ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {fieldErrors.price && <p className="text-xs text-red-500 mt-1">{fieldErrors.price}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Остаток (шт.)
          </label>
          <input
            type="number"
            min="0"
            value={values.stock}
            onChange={set('stock')}
            placeholder="0"
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.stock ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {fieldErrors.stock && <p className="text-xs text-red-500 mt-1">{fieldErrors.stock}</p>}
        </div>
      </div>

      {/* Category + Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Категория <span className="text-red-500">*</span>
          </label>
          <select
            value={values.category}
            onChange={set('category')}
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.category ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
          >
            <option value="">Выберите...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.category}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Статус
          </label>
          <select
            value={values.status}
            onChange={set('status')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
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
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition text-sm"
        >
          {isSaving ? 'Сохранение...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-sm"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
