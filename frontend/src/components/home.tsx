import { lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { useAuthStore } from '../store/authStore';

const WeatherWidget = lazy(() => import('./WeatherWidget'));

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AI Web Helper',
  url: 'http://localhost:3000',
  description: 'Минималистичный AI-помощник для поиска товаров и продуктивной работы.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'http://localhost:3000/products?search={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const weatherCity = searchParams.get('city') || 'Москва';

  useSEO({
    title: 'Главная',
    description:
      'AI Web Helper — минималистичный помощник с искусственным интеллектом для удобства и продуктивности.',
    jsonLd: websiteJsonLd,
  });

  return (
    <div className="py-4">
      {/* Hero */}
      <section
        aria-label="Приветствие"
        className="flex flex-col items-center text-center glass p-10 slide-up mb-10 rounded-2xl"
      >
        <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          {isAuthenticated && user
            ? `Добро пожаловать, ${user.username}!`
            : 'Добро пожаловать в AI Web Helper'}
        </h1>
        <p className="text-lg mb-8 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
          {isAuthenticated
            ? 'Перейдите в дашборд или изучите каталог товаров.'
            : 'Минималистичный помощник с искусственным интеллектом, созданный для удобства и продуктивности.'}
        </p>
        <nav aria-label="Действия" className="flex justify-center gap-3">
          {isAuthenticated && user ? (
            <>
              <Link to="/dashboard" className="btn-primary px-6 py-2.5 rounded-lg text-sm">
                Мой дашборд
              </Link>
              <Link
                to="/products"
                className="btn-ghost px-6 py-2.5 rounded-lg text-sm font-semibold"
              >
                Каталог
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost px-6 py-2.5 rounded-lg text-sm font-semibold">
                Войти
              </Link>
              <Link to="/register" className="btn-primary px-6 py-2.5 rounded-lg text-sm">
                Регистрация
              </Link>
              <Link
                to="/products"
                className="btn-ghost px-6 py-2.5 rounded-lg text-sm font-semibold"
              >
                Каталог
              </Link>
            </>
          )}
        </nav>
      </section>

      {/* Features + Weather */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Weather widget — lazy loaded */}
        <Suspense
          fallback={
            <div
              className="glass rounded-2xl p-5 animate-pulse"
              style={{ minHeight: 180 }}
              aria-busy="true"
              aria-label="Загрузка виджета погоды"
            />
          }
        >
          <WeatherWidget city={weatherCity} />
        </Suspense>

        {/* Features */}
        <section aria-label="Возможности" className="md:col-span-2 glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Возможности платформы
          </h2>
          <ul className="space-y-3">
            {[
              {
                icon: '🤖',
                title: 'AI-ассистент',
                desc: 'Задавайте вопросы и получайте мгновенные ответы от локальной LLM.',
              },
              {
                icon: '🛍️',
                title: 'Каталог товаров',
                desc: 'Публикуйте, ищите и управляйте товарами с фильтрацией и пагинацией.',
              },
              {
                icon: '🔒',
                title: 'Безопасность',
                desc: 'JWT-авторизация, ролевая модель доступа и защищённые маршруты.',
              },
            ].map(({ icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {icon}
                </span>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
