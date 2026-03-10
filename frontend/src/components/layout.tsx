import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import FloatingLLMChat from './floatingLLMChat';
import NavLink from './navLink';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Обновляем отображение при изменении профиля пользователя
  useEffect(() => {
    // Этот эффект сработает при изменении объекта user
    // и обновит UI с новыми данными роли
  }, [user?.profile?.role]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <header className="w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <Link
            to="/"
            className="text-lg font-medium tracking-tight hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            AI Web Helper
          </Link>

          <nav className="hidden sm:flex gap-6 items-center">
            <NavLink to="/">Главная</NavLink>
            <NavLink to="/about">О нас</NavLink>
            <NavLink to="/products">Каталог</NavLink>

            {isAuthenticated && user ? (
              <>
                <NavLink to="/dashboard">Дашборд</NavLink>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Выйти
                </button>{' '}
                {user.profile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="px-3 py-1.5 bg-purple-600 dark:bg-purple-700 text-white text-sm rounded-md hover:bg-purple-700 dark:hover:bg-purple-800 transition shadow-sm"
                  >
                    Админ
                  </Link>
                )}
              </>
            ) : (
              <>
                <NavLink to="/login">Логин</NavLink>
                <NavLink to="/register">Регистрация</NavLink>
              </>
            )}
          </nav>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>{' '}
      </header>{' '}
      <main className="flex-1 w-full px-4 py-8">{children}</main>
      {isAuthenticated && <FloatingLLMChat />}
      <footer className="py-8 text-center text-s footer">© 2025 AI Web Helper</footer>
    </div>
  );
}
