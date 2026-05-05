import type { AxiosError } from 'axios';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setError('Введите email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Введите корректный email');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await api.post('/users/password-reset/', { email });
      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Ошибка при отправке письма');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="max-w-md w-full text-center glass p-8 slide-up">
          <div
            className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--success-soft)' }}
          >
            <svg
              className="w-7 h-7"
              style={{ color: 'var(--success)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Письмо отправлено
          </h2>
          <p className="mb-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Инструкция по восстановлению отправлена на{' '}
            <strong style={{ color: 'var(--accent)' }}>{email}</strong>
          </p>
          <p className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            Проверьте почту (и папку «Спам»)
          </p>
          <Link
            to="/login"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Вернуться на страницу входа
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-md glass p-8 slide-up">
        <h1
          className="text-3xl font-bold mb-2 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Восстановление пароля
        </h1>
        <p className="text-center mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          Введите email, и мы отправим ссылку для восстановления.
        </p>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{
              background: 'var(--error-soft)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={handleChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 8px var(--accent-glow)' }}
          >
            {isLoading ? 'Отправка...' : 'Отправить письмо'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Вспомнили пароль?{' '}
          <Link
            to="/login"
            className="font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
