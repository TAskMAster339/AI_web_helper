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
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      navigate('/register-info', { state: { email: formData.email } });
    } catch (err) {
      console.error('Register error:', err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md glass p-8 slide-up">
        <h1
          className="text-3xl font-bold mb-2 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Регистрация
        </h1>
        <p className="text-center mb-6" style={{ color: 'var(--text-muted)' }}>
          Создайте аккаунт для доступа ко всем возможностям.
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
            placeholder="Логин (имя пользователя)"
            value={formData.username}
            onChange={handleChange}
            disabled={isLoading}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
          />
          <input
            type="password"
            name="password"
            placeholder="Пароль (минимум 8 символов)"
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
            className="btn-primary w-full py-2.5 rounded-lg text-sm"
          >
            {isLoading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Уже есть аккаунт?{' '}
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
