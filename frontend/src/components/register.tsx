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
    <div className="max-w-2xl text-center">
      <h1 className="text-4xl font-bold mb-4">Регистрация</h1>
      <p className="text-lg mb-6">
        Создайте новый аккаунт, чтобы пользоваться всеми возможностями AI Web Helper.
      </p>

      {(error || formError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error || formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          name="username"
          placeholder="Логин (имя пользователя) — обязательное, уникальное"
          value={formData.username}
          onChange={handleChange}
          disabled={isLoading}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        />
        <input
          type="email"
          name="email"
          placeholder="Email — обязательный, уникальный"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        />
        <input
          type="password"
          name="password"
          placeholder="Пароль"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        />
        <input
          type="password"
          name="password2"
          placeholder="Подтвердите пароль"
          value={formData.password2}
          onChange={handleChange}
          disabled={isLoading}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 border rounded-lg transition link disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Загрузка...' : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-blue-500 underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
