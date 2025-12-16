import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface AuthRedirectRouteProps {
  children: React.ReactNode;
}

/**
 * Если пользователь уже залогинен, перенаправляет на /dashboard
 * Иначе показывает компонент
 */
const AuthRedirectRoute = ({ children }: AuthRedirectRouteProps) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
export default AuthRedirectRoute;
