import { Link, useLocation } from 'react-router-dom';

export default function RegisterInfo() {
  const location = useLocation();
  const email = location.state?.email || '';

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="max-w-lg w-full glass p-8 slide-up">
        <div className="text-center mb-6">
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Подтвердите вашу почту
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Осталось совсем немного до завершения регистрации
          </p>
        </div>

        <div
          className="p-5 rounded-lg mb-5"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--accent)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <p className="mb-2">
                На email{' '}
                {email && (
                  <span className="font-bold" style={{ color: 'var(--accent)' }}>
                    {email}
                  </span>
                )}{' '}
                отправлено письмо с ссылкой подтверждения.
              </p>
              <p className="mb-2">Откройте почту и перейдите по ссылке для активации аккаунта.</p>
              <p>После этого вы сможете войти и пользоваться AI Web Helper.</p>
            </div>
          </div>
        </div>

        <div
          className="p-4 rounded-lg mb-6"
          style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold">💡 Не видите письмо?</span>
            <br />
            Проверьте папку «Спам». Если письмо не пришло в течение 5 минут, попробуйте заново.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white text-center transition-all"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 2px 8px var(--accent-glow)',
            }}
          >
            Перейти к входу
          </Link>
          <Link
            to="/register"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-center transition-all"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            Зарегистрироваться заново
          </Link>
        </div>
      </div>
    </div>
  );
}
