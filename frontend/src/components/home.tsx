import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-xl w-full text-center glass p-10 slide-up">
        <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Добро пожаловать в AI Web Helper
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
          Минималистичный помощник с искусственным интеллектом, созданный для удобства и
          продуктивности.
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/login" className="btn-ghost px-6 py-2.5 rounded-lg text-sm font-semibold">
            Войти
          </Link>
          <Link to="/register" className="btn-primary px-6 py-2.5 rounded-lg text-sm">
            Регистрация
          </Link>
        </div>
      </div>
    </div>
  );
}
