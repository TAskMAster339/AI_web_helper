import { Link, useLocation } from 'react-router-dom';

export default function RegisterInfo() {
  const location = useLocation();
  const email = location.state?.email || '';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center mb-6">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            Подтвердите вашу почту
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Осталось совсем немного до завершения регистрации
          </p>
        </div>

        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-800 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">
                На указанный вами email{' '}
                {email && (
                  <span className="font-bold text-blue-600 dark:text-blue-400">{email}</span>
                )}{' '}
                отправлено письмо с ссылкой подтверждения регистрации.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Пожалуйста, откройте вашу почту и перейдите по ссылке из письма для активации
                аккаунта.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                После этого вы сможете войти в систему и пользоваться всеми возможностями AI Web
                Helper.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded-lg mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">💡 Не видите письмо?</span>
            <br />
            Проверьте папку "Спам" или "Промоакции". Если письмо не пришло в течение 5 минут,
            попробуйте зарегистрироваться заново.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/login"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md hover:shadow-lg font-semibold text-center"
          >
            Перейти к входу
          </Link>
          <Link
            to="/register"
            className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition font-semibold text-center"
          >
            Зарегистрироваться заново
          </Link>
        </div>
      </div>
    </div>
  );
}
