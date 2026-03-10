import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
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

    // Валидация
    if (!formData.username || !formData.email || !formData.password || !formData.password2) {
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

    try {
      await register(formData.username, formData.email, formData.password, formData.password2);
      // после регистрации переход на инфо-страницу с email
      navigate('/register-info', { state: { email: formData.email } });
    } catch (err) {
      console.error('Register error:', err);
    }
  };
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white text-center">
          Регистрация
        </h1>
        <p className="text-lg mb-6 text-gray-700 dark:text-gray-300 text-center">
          Создайте новый аккаунт, чтобы пользоваться всеми возможностями AI Web Helper.
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
            placeholder="Логин (имя пользователя)"
            value={formData.username}
            onChange={handleChange}
            disabled={isLoading}
            className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="password"
            name="password"
            placeholder="Пароль (минимум 8 символов)"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
            className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="password"
            name="password2"
            placeholder="Подтвердите пароль"
            value={formData.password2}
            onChange={handleChange}
            disabled={isLoading}
            className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-700 dark:text-gray-300">
          Уже есть аккаунт?{' '}
          <Link
            to="/login"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
