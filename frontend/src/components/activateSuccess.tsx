import { Link } from 'react-router-dom';

export default function ActivateSuccess() {
  return (
    <div className="max-w-xl mx-auto mt-20 text-center">
      <h2 className="text-3xl font-bold mb-4 text-green-600">Почта подтверждена!</h2>
      <div className="p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg mb-6">
        Ваш аккаунт успешно активирован.
        <br />
        Теперь вы можете войти и пользоваться всеми возможностями AI Web Helper.
      </div>
      <Link
        to="/login"
        className="text-white bg-blue-600 px-6 py-2 rounded-lg font-medium shadow hover:bg-blue-700 transition"
      >
        Войти
      </Link>
    </div>
  );
}
