import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div className="max-w-2xl text-center">
      <h1 className="text-4xl font-bold mb-4">Регистрация</h1>
      <p className="text-lg mb-6">
        Создайте новый аккаунт, чтобы пользоваться всеми возможностями AI Web Helper.
      </p>
      <form className="flex flex-col gap-4">
        <input type="text" placeholder="Имя" className="px-4 py-2 border rounded-lg" />
        <input type="email" placeholder="Email" className="px-4 py-2 border rounded-lg" />
        <input type="password" placeholder="Пароль" className="px-4 py-2 border rounded-lg" />
        <button type="submit" className="px-5 py-2 border rounded-lg transition link">
          Зарегистрироваться
        </button>
      </form>
      <p className="mt-4 text-sm">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-blue-500 underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
