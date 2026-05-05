import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  useSEO({ title: 'Вход', description: 'Войдите в аккаунт AI Web Helper.', noIndex: true });
  const { login, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md glass p-8 slide-up">
        <h1
          className="text-3xl font-bold mb-2 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Вход
        </h1>
        <p className="text-center mb-6" style={{ color: 'var(--text-muted)' }}>
          Войдите в свой аккаунт, чтобы продолжить работу.
        </p>

        {(error || formError) && (
          <div
            className="mb-4 p-3 rounded-lg text-sm font-medium"
            style={{
              background: 'var(--error-soft)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
            }}
          >
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
          />
          <input
            type="password"
            name="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-2.5 rounded-lg text-sm"
          >
            {isLoading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm space-y-2">
          <p style={{ color: 'var(--text-muted)' }}>
            <Link
              to="/forgot-password"
              className="font-medium hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Забыли пароль?
            </Link>
          </p>
          <p style={{ color: 'var(--text-muted)' }}>
            Нет аккаунта?{' '}
            <Link
              to="/register"
              className="font-medium hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
