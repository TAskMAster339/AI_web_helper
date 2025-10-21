import { Link } from 'react-router-dom';

export default function Login() {
  return (
    <div className="max-w-2xl text-center">
      <h1 className="text-4xl font-bold mb-4">Вход</h1>
      <p className="text-lg mb-6">
        Войдите в свой аккаунт, чтобы продолжить работу с AI Web Helper.
      </p>
      <form className="flex flex-col gap-4">
        <input type="email" placeholder="Почта" className="px-4 py-2 border rounded-lg" />
        <input type="password" placeholder="Пароль" className="px-4 py-2 border rounded-lg" />
        <button type="submit" className="px-5 py-2 border rounded-lg transition link">
          Войти
        </button>
      </form>
      <p className="mt-4 text-sm">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-blue-500 underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
