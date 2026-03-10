import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="max-w-md w-full text-center glass p-10 slide-up">
        <h1 className="text-6xl font-bold mb-2" style={{ color: 'var(--accent)' }}>
          404
        </h1>
        <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Страница не найдена
        </h2>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
          К сожалению, такой страницы не существует.
        </p>
        <Link
          to="/"
          className="inline-flex px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            boxShadow: '0 2px 8px var(--accent-glow)',
          }}
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
