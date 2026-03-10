import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import UserProfilePage from './components/UserProfilePage';
import About from './components/about';
import ActivateSuccess from './components/activateSuccess';
import AdminPanel from './components/adminPanel';
import AuthRedirectRoute from './components/authRedirectRoute';
import Dashboard from './components/dashboard';
import ForgotPassword from './components/forgotPassword';
import Home from './components/home';
import Layout from './components/layout';
import Login from './components/login';
import NotFound from './components/notFound';
import ProductCreatePage from './components/products/ProductCreatePage';
import ProductDetailPage from './components/products/ProductDetailPage';
import ProductEditPage from './components/products/ProductEditPage';
import ProductsPage from './components/products/ProductsPage';
import ProtectedRoute from './components/protectedRoute';
import Register from './components/register';
import RegisterInfo from './components/registerInfo';
import ResetPassword from './components/resetPassword';

import { useAuthStore } from './store/authStore';

function App() {
  const { isLoading, initializeAuth } = useAuthStore();

  // При первом рендере вызываем восстановление авторизации
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

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

          {/* Admin panel */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          <Route path="/register-info" element={<RegisterInfo />} />
          <Route path="/success-activate" element={<ActivateSuccess />} />

          {/* Восстановление пароля */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Products — каталог, просмотр, создание, редактирование */}
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductCreatePage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/products/:slug/edit" element={<ProductEditPage />} />

          {/* Публичный профиль пользователя */}
          <Route
            path="/users/:userId"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
