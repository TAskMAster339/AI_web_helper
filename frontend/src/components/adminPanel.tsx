import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

interface UserProfile {
  role: 'user' | 'premium' | 'admin';
  role_display: string;
  daily_requests_limit: number;
  daily_requests_used: number;
  requests_remaining: number | 'unlimited';
  avatar_url: string | null;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: UserProfile;
}

// ── Avatar lightbox ───────────────────────────────────────────────────────────
function AvatarLightbox({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full mx-4 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={name}
          className="w-72 h-72 rounded-full object-cover ring-4 ring-white/30 shadow-2xl"
        />
        <p className="text-white font-semibold text-lg">{name}</p>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition"
          title="Закрыть"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Avatar cell ───────────────────────────────────────────────────────────────
function UserAvatar({
  user,
  size = 'md',
  onClick,
}: {
  user: User;
  size?: 'sm' | 'md';
  onClick?: () => void;
}) {
  const initials =
    [user.first_name, user.last_name]
      .filter(Boolean)
      .map((s) => s[0].toUpperCase())
      .join('') ||
    user.username[0]?.toUpperCase() ||
    '?';

  const sizeClass = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm';
  const hasAvatar = !!user.profile.avatar_url;

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold select-none bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 ${
        hasAvatar ? 'cursor-pointer ring-2 ring-transparent hover:ring-blue-400 transition' : ''
      }`}
      onClick={hasAvatar ? onClick : undefined}
      title={hasAvatar ? 'Нажмите для просмотра' : undefined}
    >
      {hasAvatar ? (
        <img
          src={user.profile.avatar_url!}
          alt={user.username}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, refreshUserProfile } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  // ── Avatar lightbox state ─────────────────────────────────────
  const [lightboxUser, setLightboxUser] = useState<User | null>(null);

  // ── Filter state ──────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'premium' | 'admin'>('all');
  const [usageFilter, setUsageFilter] = useState<'all' | 'overLimit' | 'active'>('all');

  // ── Pagination state ──────────────────────────────────────────
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const haystack = `${u.username} ${u.email} ${u.first_name} ${u.last_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (roleFilter !== 'all' && u.profile.role !== roleFilter) return false;
      if (usageFilter === 'overLimit') {
        if (u.profile.role !== 'user') return false;
        if (u.profile.daily_requests_used < u.profile.daily_requests_limit) return false;
      }
      if (usageFilter === 'active') {
        if (u.profile.role === 'user' && u.profile.daily_requests_used === 0) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, usageFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, usageFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setUsageFilter('all');
  };

  const isFiltered = search !== '' || roleFilter !== 'all' || usageFilter !== 'all';

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
      {/* Avatar lightbox */}
      {lightboxUser?.profile.avatar_url && (
        <AvatarLightbox
          src={lightboxUser.profile.avatar_url}
          name={lightboxUser.first_name || lightboxUser.username}
          onClose={() => setLightboxUser(null)}
        />
      )}
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
            Показано:{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {filteredUsers.length}
            </span>
            {isFiltered && (
              <span className="text-gray-500 dark:text-gray-400"> из {users.length}</span>
            )}
          </p>
        </div>
      </div>
      {/* Filter bar */}
      <div className="mb-5 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, email..."
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
        >
          <option value="all">Все роли</option>
          <option value="user">Обычный</option>
          <option value="premium">Premium</option>
          <option value="admin">Администратор</option>
        </select>

        {/* Usage filter */}
        <select
          value={usageFilter}
          onChange={(e) => setUsageFilter(e.target.value as typeof usageFilter)}
          className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
        >
          <option value="all">Все активности</option>
          <option value="active">Делали запросы</option>
          <option value="overLimit">Достигли лимита</option>
        </select>

        {/* Reset */}
        {isFiltered && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-gray-300 dark:border-gray-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Сбросить
          </button>
        )}
      </div>
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-400 dark:text-gray-500"
                  >
                    <svg
                      className="w-10 h-10 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-1a4 4 0 00-5.197-3.787M9 20H4v-1a4 4 0 015.197-3.787M15 11a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                pagedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.id}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} size="sm" onClick={() => setLightboxUser(user)} />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {user.username}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {user.first_name} {user.last_name}
                          </div>
                        </div>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>{' '}
      {/* Mobile view - Card layout */}
      <div className="lg:hidden space-y-4">
        {filteredUsers.length === 0 && (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">
            <svg
              className="w-10 h-10 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-1a4 4 0 00-5.197-3.787M9 20H4v-1a4 4 0 015.197-3.787M15 11a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Пользователи не найдены
          </div>
        )}
        {pagedUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} size="md" onClick={() => setLightboxUser(user)} />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {user.username}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user.first_name} {user.last_name}
                  </p>
                </div>
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
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Страница <span className="font-semibold text-gray-800 dark:text-gray-200">{page}</span>{' '}
            из <span className="font-semibold text-gray-800 dark:text-gray-200">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1">
            {/* First */}
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Первая страница"
            >
              «
            </button>
            {/* Prev */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Предыдущая"
            >
              ‹
            </button>
            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[2rem] px-2 py-1.5 text-sm rounded-lg border transition ${
                      page === p
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Следующая"
            >
              ›
            </button>
            {/* Last */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Последняя страница"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
