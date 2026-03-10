import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
        Добро пожаловать в AI Web Helper
      </h1>
      <p className="text-lg text-gray-700 dark:text-gray-300">
        Минималистичный помощник с искусственным интеллектом, созданный для удобства и
        продуктивности.
      </p>
      <div className="mt-6 flex justify-center gap-4">
        <Link
          to="/login"
          className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 text-gray-800 dark:text-gray-200 font-medium"
        >
          Войти
        </Link>
        <Link
          to="/register"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md hover:shadow-lg font-medium"
        >
          Регистрация
        </Link>
      </div>
    </div>
  );
}
