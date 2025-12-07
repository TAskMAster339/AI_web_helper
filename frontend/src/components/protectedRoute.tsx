// import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Загрузка...</div>;
  }

  if (!isAuthenticated) {
    console.log('hello from protected route');
    // return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
