import type { AxiosError } from 'axios';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', password2: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      await api.post('/users/password-reset-confirm/', { token, password: formData.password });
      alert('Пароль успешно изменён!');
      navigate('/login');
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      setError(axiosError.response?.data?.detail || 'Ошибка при смене пароля');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-md glass p-8 slide-up">
        <h1
          className="text-3xl font-bold mb-2 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Новый пароль
        </h1>
        <p className="text-center mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          Введите новый пароль для вашего аккаунта.
        </p>

        {(error || formError) && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
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
            type="password"
            name="password"
            placeholder="Новый пароль"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
          />
          <input
            type="password"
            name="password2"
            placeholder="Подтвердите пароль"
            value={formData.password2}
            onChange={handleChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 8px var(--accent-glow)' }}
          >
            {isLoading ? 'Сохранение...' : 'Изменить пароль'}
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
