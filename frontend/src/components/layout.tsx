import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import GlassConfirmModal from './GlassConfirmModal';
import FloatingLLMChat from './floatingLLMChat';
import NavLink from './navLink';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {}, [user?.profile?.role]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync state when theme is changed externally (e.g. via LLM action handler)
  useEffect(() => {
    const onStorage = () => {
      const stored = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
      setTheme(stored);
    };
    window.addEventListener('storage', onStorage);

    // Also watch the DOM class directly via MutationObserver (same-tab changes
    // don't fire the storage event)
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      window.removeEventListener('storage', onStorage);
      observer.disconnect();
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* ── Header (glass) ── */}
      <header className="sticky top-0 z-40 glass border-t-0 border-x-0" style={{ borderRadius: 0 }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between items-center">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            AI Web Helper
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/">Главная</NavLink>
            <NavLink to="/about">О нас</NavLink>
            <NavLink to="/products">Каталог</NavLink>

            {isAuthenticated && user ? (
              <>
                <NavLink to="/dashboard">@{user.username}</NavLink>
                {user.profile?.role === 'admin' && <NavLink to="/admin">Админ</NavLink>}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="ml-2 px-4 py-2 text-sm font-medium rounded-lg btn-danger-ghost"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Логин</NavLink>
                <Link
                  to="/register"
                  className="ml-2 px-4 py-2 text-sm font-semibold rounded-lg btn-primary"
                >
                  Регистрация
                </Link>
              </>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="ml-3 btn-icon text-lg"
              aria-label="Переключить тему"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </nav>

          {/* Mobile buttons */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="btn-icon text-lg"
              aria-label="Переключить тему"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="btn-icon text-base"
              aria-label="Меню"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden px-5 pb-4 flex flex-col gap-1 slide-up">
            <NavLink to="/">Главная</NavLink>
            <NavLink to="/about">О нас</NavLink>
            <NavLink to="/products">Каталог</NavLink>
            {isAuthenticated && user ? (
              <>
                <NavLink to="/dashboard">@{user.username}</NavLink>
                {user.profile?.role === 'admin' && <NavLink to="/admin">Админ</NavLink>}
                <button
                  onClick={() => {
                    setShowLogoutConfirm(true);
                    setMobileOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-sm font-medium btn-danger-ghost"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Логин</NavLink>
                <NavLink to="/register">Регистрация</NavLink>
              </>
            )}
          </div>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-8">{children}</main>

      {/* ── Floating chat ── */}
      {isAuthenticated && <FloatingLLMChat />}

      {/* ── Footer (glass) ── */}
      <footer
        className="py-6 text-center text-sm"
        style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}
      >
        © 2026 AI Web Helper
      </footer>

      {/* ── Logout confirmation modal ── */}
      <GlassConfirmModal
        open={showLogoutConfirm}
        title="Выход из аккаунта"
        message="Вы уверены, что хотите выйти?"
        confirmLabel="Выйти"
        cancelLabel="Отмена"
        variant="warning"
        icon="🚪"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
