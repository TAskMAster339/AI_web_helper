import { Link } from 'react-router-dom';

export default function ActivateSuccess() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="max-w-md w-full text-center glass p-10 slide-up">
        <div
          className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--success-soft)' }}
        >
          <svg
            className="w-7 h-7"
            style={{ color: 'var(--success)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--success)' }}>
          Почта подтверждена!
        </h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Ваш аккаунт успешно активирован. Теперь вы можете войти и пользоваться всеми возможностями
          AI Web Helper.
        </p>
        <Link
          to="/login"
          className="inline-flex px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            boxShadow: '0 2px 8px var(--accent-glow)',
          }}
        >
          Войти
        </Link>
      </div>
    </div>
  );
}
