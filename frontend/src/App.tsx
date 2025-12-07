import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import About from './components/about';
import ActivateSuccess from './components/activateSuccess';
import AuthRedirectRoute from './components/authRedirectRoute';
import Dashboard from './components/dashboard';
import ForgotPassword from './components/forgotPassword';
import Home from './components/home';
import Layout from './components/layout';
import Login from './components/login';
import NotFound from './components/notFound';
import ProtectedRoute from './components/protectedRoute';
import Register from './components/register';
import RegisterInfo from './components/registerInfo';
import ResetPassword from './components/resetPassword';

import { useAuthStore } from './store/authStore';

function App() {
  const { fetchUser, isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  // При первом рендере вызываем восстановление авторизации
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Подгружаем пользователя после восстановления авторизации
  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, [isAuthenticated, fetchUser]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Общедоступные маршруты */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />

          {/* Перенаправление для уже авторизованных */}
          <Route
            path="/login"
            element={
              <AuthRedirectRoute>
                <Login />
              </AuthRedirectRoute>
            }
          />
          <Route
            path="/register"
            element={
              <AuthRedirectRoute>
                <Register />
              </AuthRedirectRoute>
            }
          />

          {/* Защищённый маршрут */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/register-info" element={<RegisterInfo />} />
          <Route path="/success-activate" element={<ActivateSuccess />} />

          {/* Восстановление пароля */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
