import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setFormError('Заполните все поля');
      return;
    }

    try {
      await login(formData.username, formData.password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
    }
  };
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white text-center">Вход</h1>
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300 text-center">
          Войдите в свой аккаунт, чтобы продолжить работу с AI Web Helper.
        </p>

        {(error || formError) && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 rounded-lg font-medium">
            {error || formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="username"
            placeholder="Имя пользователя или Email"
            value={formData.username}
            onChange={handleChange}
            disabled={isLoading}
            className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="password"
            name="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>

        <p className="mt-4 text-sm text-center">
          <Link
            to="/forgot-password"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Забыли пароль?
          </Link>
        </p>

        <p className="mt-4 text-sm text-center text-gray-700 dark:text-gray-300">
          Нет аккаунта?{' '}
          <Link
            to="/register"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
