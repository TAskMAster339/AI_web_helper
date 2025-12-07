import { useLocation, Link } from 'react-router-dom';

export default function RegisterInfo() {
  const location = useLocation();
  const email = location.state?.email || '';

  return (
    <div className="max-w-xl mx-auto mt-20 text-center">
      <h2 className="text-2xl font-bold mb-4">Подтвердите вашу почту</h2>
      <div className="p-4 bg-blue-100 border border-blue-400 text-blue-800 rounded-lg mb-6">
        <p>
          На указанный вами email <b>{email}</b> отправлено письмо с ссылкой подтверждения
          регистрации.
        </p>
        <p className="mt-2">
          Пожалуйста, откройте вашу почту и перейдите по ссылке из письма для активации аккаунта.
          <br />
          После этого вы сможете войти в систему.
        </p>
        <p className="mt-4 text-gray-500 text-sm">
          Не видите письмо? Проверьте папку "Спам" или попробуйте зарегистрироваться заново.
        </p>
      </div>
      <Link to="/login" className="text-blue-600 underline">
        Войти
      </Link>
    </div>
  );
}
