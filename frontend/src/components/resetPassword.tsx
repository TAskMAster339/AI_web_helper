import type { AxiosError } from 'axios';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // Токен из URL (из письма)

  const [formData, setFormData] = useState({
    password: '',
    password2: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError('');
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Валидация
    if (!formData.password || !formData.password2) {
      setFormError('Заполните все поля');
      return;
    }

    if (formData.password !== formData.password2) {
      setFormError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('Пароль должен быть не менее 8 символов');
      return;
    }

    if (!token) {
      setFormError('Отсутствует токен восстановления');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post('/users/password-reset-confirm/', {
        token,
        password: formData.password,
      });

      // Успешно сброшен — перенаправляем на логин
      alert('Пароль успешно изменён!');
      navigate('/login');
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      const message = axiosError.response?.data?.detail || 'Ошибка при смене пароля';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Новый пароль</h1>
      <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
        Введите новый пароль для вашего аккаунта
      </p>

      {(error || formError) && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 rounded-lg">
          {error || formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          name="password"
          placeholder="Новый пароль"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="password"
          name="password2"
          placeholder="Подтвердите пароль"
          value={formData.password2}
          onChange={handleChange}
          disabled={isLoading}
          className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isLoading ? 'Сохранение...' : 'Изменить пароль'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Вспомнили пароль?{' '}
        <Link
          to="/login"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}
