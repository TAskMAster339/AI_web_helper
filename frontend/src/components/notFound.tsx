import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-2xl text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <h2 className="text-4xl font-bold mb-4">Страница не найдена</h2>
      <p className="text-lg mb-6">К сожалению, такой страницы не существует.</p>
      <Link to="/" className="px-5 py-2 border rounded-lg transition link">
        На главную
      </Link>
    </div>
  );
}
