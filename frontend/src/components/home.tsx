import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-2xl text-center">
      <h1 className="text-4xl font-bold mb-4">Добро пожаловать в AI Web Helper</h1>
      <p className="text-lg">
        Минималистичный помощник с искусственным интеллектом, созданный для удобства и
        продуктивности.
      </p>
      <div className="mt-6 flex justify-center gap-4">
        <Link to="/login" className="px-5 py-2 border rounded-lg transition link">
          Войти
        </Link>
        <Link to="/register" className="px-5 py-2 border rounded-lg transition link">
          Регистрация
        </Link>
      </div>
    </div>
  );
}
