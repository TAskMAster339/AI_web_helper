import type { AxiosError } from 'axios';
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
    <div className="max-w-2xl text-center">
      <h1 className="text-4xl font-bold mb-4">Новый пароль</h1>
      <p className="text-lg mb-6">Введите новый пароль для вашего аккаунта</p>

      {(error || formError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
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
          {isLoading ? 'Сохранение...' : 'Изменить пароль'}
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
