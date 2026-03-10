import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

interface UserProfile {
  role: 'user' | 'premium' | 'admin';
  role_display: string;
  daily_requests_limit: number;
  daily_requests_used: number;
  requests_remaining: number | 'unlimited';
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: UserProfile;
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, refreshUserProfile } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.profile?.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchUsers();
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get<User[]>('/users/admin/users/');
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };
  const updateUserRole = async (userId: number, newRole: 'user' | 'premium' | 'admin') => {
    // Сохраняем старую роль для возможности отката
    const oldUsers = [...users];
    const oldRole = users.find((u) => u.id === userId)?.profile.role;

    // Оптимистичное обновление UI - обновляем сразу
    setUsers(
      users.map((u) =>
        u.id === userId
          ? {
              ...u,
              profile: {
                ...u.profile,
                role: newRole,
                role_display: getRoleDisplay(newRole),
              },
            }
          : u
      )
    );

    setUpdatingUserId(userId);

    try {
      // Отправляем запрос на сервер
      await api.patch(`/users/admin/users/${userId}/role/`, { role: newRole });

      // Если админ изменил роль текущего пользователя, обновляем его профиль
      if (userId === currentUser?.id) {
        await refreshUserProfile();
      }

      setError(null);
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Ошибка при обновлении роли пользователя');

      // Откатываем изменения при ошибке
      setUsers(oldUsers);

      // Показываем уведомление об ошибке
      alert(`Не удалось изменить роль. Роль откатана к: ${oldRole}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'premium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  const getRoleDisplay = (role: 'user' | 'premium' | 'admin'): string => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'premium':
        return 'Пользователь с подпиской';
      case 'user':
        return 'Обычный пользователь';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Управление пользователями
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Управляйте ролями и правами доступа пользователей
          </p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-4 py-2 rounded-lg">
          <p>
            Всего:{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{users.length}</span>
          </p>
        </div>
      </div>{' '}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}
      {/* Desktop view */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            {' '}
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Запросы
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.id}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {user.username}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">
                    {user.email}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                        user.profile.role
                      )}`}
                    >
                      {user.profile.role_display}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-400">
                    {user.profile.role === 'user' ? (
                      <span>
                        {user.profile.daily_requests_used} / {user.profile.daily_requests_limit}
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400 font-semibold">∞</span>
                    )}
                  </td>{' '}
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <select
                      value={user.profile.role}
                      onChange={(e) =>
                        updateUserRole(user.id, e.target.value as 'user' | 'premium' | 'admin')
                      }
                      disabled={updatingUserId === user.id || user.id === currentUser?.id}
                      className="w-32 px-3 py-1.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                    >
                      <option value="user">Обычный</option>
                      <option value="premium">Premium</option>
                      <option value="admin">Админ</option>
                    </select>
                    {user.id === currentUser?.id && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 block font-medium">
                        (Вы)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>{' '}
      {/* Mobile view - Card layout */}
      <div className="lg:hidden space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {user.username}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user.first_name} {user.last_name}
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                ID: {user.id}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                <span className="text-gray-700 dark:text-gray-400 font-medium">Email:</span>
                <span className="text-gray-900 dark:text-gray-100 font-semibold">{user.email}</span>
              </div>

              <div className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                <span className="text-gray-700 dark:text-gray-400 font-medium">Роль:</span>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                    user.profile.role
                  )}`}
                >
                  {user.profile.role_display}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                <span className="text-gray-700 dark:text-gray-400 font-medium">Запросы:</span>
                <span className="text-gray-900 dark:text-gray-100 font-semibold">
                  {user.profile.role === 'user' ? (
                    `${user.profile.daily_requests_used} / ${user.profile.daily_requests_limit}`
                  ) : (
                    <span className="text-green-600 dark:text-green-400">∞</span>
                  )}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-300 mb-2">
                Изменить роль:{' '}
              </label>
              <select
                value={user.profile.role}
                onChange={(e) =>
                  updateUserRole(user.id, e.target.value as 'user' | 'premium' | 'admin')
                }
                disabled={updatingUserId === user.id || user.id === currentUser?.id}
                className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <option value="user">Обычный</option>
                <option value="premium">Premium</option>
                <option value="admin">Админ</option>
              </select>
              {user.id === currentUser?.id && (
                <span className="text-xs text-blue-600 dark:text-blue-400 mt-2 block font-medium">
                  (Это ваш аккаунт)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
