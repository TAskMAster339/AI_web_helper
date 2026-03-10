import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, fetchUser, refreshUserProfile, error } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.email) {
      fetchUser();
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserProfile();
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <div className="max-w-3xl mx-auto p-8 mt-16">
      {' '}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 p-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Добро пожаловать, {user?.username || 'Гость'}!
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Обновить данные профиля"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Обновление...' : 'Обновить'}
          </button>
        </div>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
          Это ваш персональный кабинет. Здесь вы можете посмотреть информацию о себе.
        </p>
        <div className="my-8 space-y-4 text-gray-800 dark:text-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Email</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {user?.email || '—'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Имя</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {user?.first_name || '—'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Фамилия</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {user?.last_name || '—'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Роль</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {user?.profile?.role_display || '—'}
              </div>
            </div>
          </div>{' '}
          {user?.profile && (
            <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-800">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Статистика запросов к AI
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Использовано сегодня
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {user.profile.role === 'user'
                      ? `${user.profile.daily_requests_used} / ${user.profile.daily_requests_limit}`
                      : '∞'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Доступные модели</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {user.profile.available_models === 'all'
                      ? 'Все'
                      : user.profile.available_models?.length || 1}
                  </div>
                </div>
              </div>
              {user.profile.role === 'user' && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  💡 Обновите до Premium для неограниченных запросов и доступа ко всем моделям!
                </div>
              )}
            </div>
          )}
          {user?.profile?.role === 'admin' && (
            <div className="mt-6">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                Панель администратора
              </Link>
            </div>
          )}
        </div>{' '}
        {!!error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-2 border-red-300 dark:border-red-700 rounded-lg font-medium">
            {error}
          </div>
        )}{' '}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-300 font-medium"
          >
            Выйти
          </button>
          <Link
            to="/"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md hover:shadow-lg font-medium"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
