import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, fetchUser, error } = useAuthStore();

  useEffect(() => {
    if (!user?.email) {
      fetchUser();
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto text-center p-8 mt-16 bg-background-light dark:bg-background-dark rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <h1 className="text-4xl font-bold mb-4 text-text-light dark:text-text-dark">
        Добро пожаловать, {user?.username || 'Гость'}!
      </h1>
      <p className="text-lg text-text-light dark:text-text-dark mb-6">
        Это ваш персональный кабинет. Здесь вы можете посмотреть информацию о себе.
      </p>
      <div className="my-8 text-left text-text-light dark:text-text-dark">
        <div className="mb-3">
          <b>Email:</b> {user?.email || '—'}
        </div>
        <div className="mb-3">
          <b>Имя:</b> {user?.first_name || '—'}
        </div>
        <div className="mb-3">
          <b>Фамилия:</b> {user?.last_name || '—'}
        </div>
      </div>
      {!!error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-700 text-red-700 dark:text-red-200 border rounded-lg">
          {error}
        </div>
      )}
      <div className="mt-8 flex justify-center gap-4">
        <button onClick={handleLogout} className="px-5 py-2 border rounded-lg transition link">
          Выйти
        </button>
        {/* Для примера можно добавить ссылку на главную или редактирование профиля */}
        <Link to="/" className="px-5 py-2 border rounded-lg transition link">
          На главную
        </Link>
      </div>
    </div>
  );
}
