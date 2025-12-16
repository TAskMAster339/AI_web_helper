import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FloatingLLMChat from './floatingLLMChat';
import NavLink from './navLink';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

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

  return (
    <div className="min-h-screen flex flex-col bg-background-light text-text-light dark:bg-background-dark dark:text-text-dark transition-colors duration-200 font-sans">
      <header className="w-full border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <Link to="/" className="text-lg font-medium tracking-tight">
            AI Web Helper
          </Link>

          <nav className="hidden sm:flex gap-8">
            <NavLink to="/">Главная</NavLink>
            <NavLink to="/about">О нас</NavLink>
            <NavLink to="/login">Логин</NavLink>
            <NavLink to="/register">Регистрация</NavLink>
          </nav>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition"
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">{children}</main>
      <FloatingLLMChat />

      <footer className="py-8 text-center text-s footer">© 2025 AI Web Helper</footer>
    </div>
  );
}
