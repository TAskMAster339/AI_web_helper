import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import GlassConfirmModal from './GlassConfirmModal';

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

/* ── Lightbox ── */
function AvatarLightbox({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-4 slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={name}
          className="w-72 h-72 rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
        />
        <p className="text-white font-semibold text-lg">{name}</p>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition"
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

/* ── Avatar ── */
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
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm';
  const has = !!user.profile.avatar_url;
  return (
    <div
      className={`${sz} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold select-none ${has ? 'cursor-pointer' : ''}`}
      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
      onClick={has ? onClick : undefined}
      title={has ? 'Нажмите для просмотра' : undefined}
    >
      {has ? (
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

/* ── Role badge ── */
function RoleBadge({ role, display }: { role: string; display: string }) {
  const s: Record<string, { bg: string; color: string }> = {
    admin: { bg: 'var(--error-soft)', color: 'var(--error)' },
    premium: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
    user: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  };
  const st = s[role] ?? s.user;
  return (
    <span
      className="px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full"
      style={{ background: st.bg, color: st.color }}
    >
      {display}
    </span>
  );
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, refreshUserProfile } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [lightboxUser, setLightboxUser] = useState<User | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: number;
    username: string;
    newRole: 'user' | 'premium' | 'admin';
  } | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'premium' | 'admin'>('all');
  const [usageFilter, setUsageFilter] = useState<'all' | 'overLimit' | 'active'>('all');
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const h = `${u.username} ${u.email} ${u.first_name} ${u.last_name}`.toLowerCase();
        if (!h.includes(q)) return false;
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

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, usageFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = search !== '' || roleFilter !== 'all' || usageFilter !== 'all';
  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setUsageFilter('all');
  };

  useEffect(() => {
    if (!currentUser || currentUser.profile?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const r = await api.get<User[]>('/users/admin/users/');
      setUsers(r.data);
      setError(null);
    } catch {
      setError('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: number, newRole: 'user' | 'premium' | 'admin') => {
    setPendingRoleChange(null);
    const oldUsers = [...users];
    const oldRole = users.find((u) => u.id === userId)?.profile.role;
    setUsers(
      users.map((u) =>
        u.id === userId
          ? {
              ...u,
              profile: { ...u.profile, role: newRole, role_display: getRoleDisplay(newRole) },
            }
          : u
      )
    );
    setUpdatingUserId(userId);
    try {
      await api.patch(`/users/admin/users/${userId}/role/`, { role: newRole });
      if (userId === currentUser?.id) await refreshUserProfile();
      setError(null);
    } catch {
      setError('Ошибка при обновлении роли');
      setUsers(oldUsers);
      alert(`Не удалось изменить роль. Роль откатана к: ${oldRole}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const requestRoleChange = (
    userId: number,
    username: string,
    newRole: 'user' | 'premium' | 'admin'
  ) => {
    // Don't show modal if the role is the same
    const current = users.find((u) => u.id === userId)?.profile.role;
    if (current === newRole) return;
    setPendingRoleChange({ userId, username, newRole });
  };

  const getRoleDisplay = (role: 'user' | 'premium' | 'admin'): string => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'premium':
        return 'Пользователь с подпиской';
      default:
        return 'Обычный пользователь';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div
          className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="w-full slide-up">
      {lightboxUser?.profile.avatar_url && (
        <AvatarLightbox
          src={lightboxUser.profile.avatar_url}
          name={lightboxUser.first_name || lightboxUser.username}
          onClose={() => setLightboxUser(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Управление пользователями
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Управляйте ролями и правами доступа
          </p>
        </div>
        <div
          className="text-sm px-4 py-2 rounded-lg glass-subtle"
          style={{ color: 'var(--text-secondary)' }}
        >
          Показано:{' '}
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {filteredUsers.length}
          </span>
          {isFiltered && <span style={{ color: 'var(--text-muted)' }}> из {users.length}</span>}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-5 p-4 glass rounded-xl flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, email..."
            className="w-full text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="text-sm py-2 px-3"
        >
          <option value="all">Все роли</option>
          <option value="user">Обычный</option>
          <option value="premium">Premium</option>
          <option value="admin">Администратор</option>
        </select>
        <select
          value={usageFilter}
          onChange={(e) => setUsageFilter(e.target.value as typeof usageFilter)}
          className="text-sm py-2 px-3"
        >
          <option value="all">Все активности</option>
          <option value="active">Делали запросы</option>
          <option value="overLimit">Достигли лимита</option>
        </select>
        {isFiltered && (
          <button
            onClick={handleResetFilters}
            className="btn-danger-ghost flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg"
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
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            background: 'var(--error-soft)',
            border: '1px solid var(--error)',
            color: 'var(--error)',
          }}
        >
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden lg:block glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['ID', 'Пользователь', 'Email', 'Роль', 'Запросы', 'Действия'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center"
                    style={{ color: 'var(--text-muted)' }}
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
                  <tr
                    key={user.id}
                    className="transition"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td
                      className="px-4 py-4 text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {user.id}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} size="sm" onClick={() => setLightboxUser(user)} />
                        <div>
                          <div
                            className="text-sm font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {user.username}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {user.first_name} {user.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {user.email}
                    </td>
                    <td className="px-4 py-4">
                      <RoleBadge role={user.profile.role} display={user.profile.role_display} />
                    </td>
                    <td
                      className="px-4 py-4 text-sm font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {user.profile.role === 'user' ? (
                        `${user.profile.daily_requests_used} / ${user.profile.daily_requests_limit}`
                      ) : (
                        <span style={{ color: 'var(--success)' }}>∞</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <select
                        value={user.profile.role}
                        onChange={(e) =>
                          requestRoleChange(
                            user.id,
                            user.username,
                            e.target.value as 'user' | 'premium' | 'admin'
                          )
                        }
                        disabled={updatingUserId === user.id || user.id === currentUser?.id}
                        className="w-32 text-sm py-1.5 px-3"
                      >
                        <option value="user">Обычный</option>
                        <option value="premium">Premium</option>
                        <option value="admin">Админ</option>
                      </select>
                      {user.id === currentUser?.id && (
                        <span
                          className="text-xs mt-1 block font-medium"
                          style={{ color: 'var(--accent)' }}
                        >
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
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-4">
        {filteredUsers.length === 0 && (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
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
          <div key={user.id} className="glass p-5 glass-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} size="md" onClick={() => setLightboxUser(user)} />
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {user.username}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {user.first_name} {user.last_name}
                  </p>
                </div>
              </div>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-lg glass-subtle"
                style={{ color: 'var(--text-muted)' }}
              >
                ID: {user.id}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { label: 'Email', val: user.email },
                {
                  label: 'Запросы',
                  val:
                    user.profile.role === 'user'
                      ? `${user.profile.daily_requests_used} / ${user.profile.daily_requests_limit}`
                      : '∞',
                },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex justify-between items-center text-sm p-2 rounded-lg"
                  style={{ background: 'var(--bg-surface)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}:</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {r.val}
                  </span>
                </div>
              ))}
              <div
                className="flex justify-between items-center text-sm p-2 rounded-lg"
                style={{ background: 'var(--bg-surface)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Роль:</span>
                <RoleBadge role={user.profile.role} display={user.profile.role_display} />
              </div>
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Изменить роль:
              </label>
              <select
                value={user.profile.role}
                onChange={(e) =>
                  requestRoleChange(
                    user.id,
                    user.username,
                    e.target.value as 'user' | 'premium' | 'admin'
                  )
                }
                disabled={updatingUserId === user.id || user.id === currentUser?.id}
                className="w-full text-sm"
              >
                <option value="user">Обычный</option>
                <option value="premium">Premium</option>
                <option value="admin">Админ</option>
              </select>
              {user.id === currentUser?.id && (
                <span className="text-xs mt-2 block font-medium" style={{ color: 'var(--accent)' }}>
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
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Страница{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {page}
            </span>{' '}
            из{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {totalPages}
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            {[
              { label: '«', action: () => setPage(1), dis: page === 1 },
              { label: '‹', action: () => setPage((p) => Math.max(1, p - 1)), dis: page === 1 },
            ].map((b, i) => (
              <button
                key={i}
                onClick={b.action}
                disabled={b.dis}
                className="btn-ghost px-2.5 py-1.5 text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {b.label}
              </button>
            ))}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '…' ? (
                  <span
                    key={`e-${idx}`}
                    className="px-2 py-1.5 text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[2rem] px-2.5 py-1.5 text-sm rounded-lg font-medium cursor-pointer ${
                      page === p ? 'btn-primary' : 'btn-ghost'
                    }`}
                    style={page === p ? { boxShadow: '0 4px 14px var(--accent-glow)' } : undefined}
                  >
                    {p}
                  </button>
                )
              )}
            {[
              {
                label: '›',
                action: () => setPage((p) => Math.min(totalPages, p + 1)),
                dis: page === totalPages,
              },
              { label: '»', action: () => setPage(totalPages), dis: page === totalPages },
            ].map((b, i) => (
              <button
                key={i}
                onClick={b.action}
                disabled={b.dis}
                className="btn-ghost px-2.5 py-1.5 text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Role change confirmation */}
      <GlassConfirmModal
        open={pendingRoleChange !== null}
        title="Изменить роль пользователя?"
        message={
          pendingRoleChange
            ? `Вы собираетесь изменить роль пользователя «${pendingRoleChange.username}» на «${getRoleDisplay(pendingRoleChange.newRole)}». Продолжить?`
            : ''
        }
        confirmLabel="Изменить"
        cancelLabel="Отмена"
        variant="warning"
        icon="👤"
        onConfirm={() => {
          if (pendingRoleChange) {
            updateUserRole(pendingRoleChange.userId, pendingRoleChange.newRole);
          }
        }}
        onCancel={() => setPendingRoleChange(null)}
      />
    </div>
  );
};

export default AdminPanel;
