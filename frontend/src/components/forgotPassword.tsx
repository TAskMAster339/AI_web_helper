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
      const message = axiosError.response?.data?.detail || 'Ошибка при отправке письма';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">Письмо отправлено</h1>
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          <p>
            Мы отправили инструкцию по восстановлению пароля на <strong>{email}</strong>
          </p>
          <p className="mt-2 text-sm">Проверьте вашу почту (и папку "Спам")</p>
        </div>
        <Link to="/login" className="text-blue-500 underline">
          Вернуться на страницу входа
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl text-center">
      <h1 className="text-4xl font-bold mb-4">Восстановление пароля</h1>
      <p className="text-lg mb-6">
        Введите email, связанный с вашим аккаунтом, и мы отправим вам ссылку для восстановления
        пароля.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
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
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 border rounded-lg transition link disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Отправка...' : 'Отправить письмо'}
        </button>
      </form>

      <p className="mt-4 text-sm">
        Вспомнили пароль?{' '}
        <Link to="/login" className="text-blue-500 underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
