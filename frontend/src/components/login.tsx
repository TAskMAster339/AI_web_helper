import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    <div className="max-w-2xl text-center">
      <h1 className="text-4xl font-bold mb-4">Вход</h1>
      <p className="text-lg mb-6">
        Войдите в свой аккаунт, чтобы продолжить работу с AI Web Helper.
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
          placeholder="Имя пользователя или Email"
          value={formData.username}
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
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 border rounded-lg transition link disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Загрузка...' : 'Войти'}
        </button>
      </form>

      <p className="mt-2 text-sm">
        <Link to="/forgot-password" className="text-blue-500 underline">
          Забыли пароль?
        </Link>
      </p>

      <p className="mt-4 text-sm">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-blue-500 underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
