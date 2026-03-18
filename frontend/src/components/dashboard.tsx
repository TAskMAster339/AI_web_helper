import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { useAuthStore } from '../store/authStore';
import GlassConfirmModal from './GlassConfirmModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, fetchUser, updateProfile, uploadAvatar, deleteAvatar } = useAuthStore();
  useSEO({
    title: 'Личный кабинет',
    description: 'Управление профилем и настройками.',
    noIndex: true,
  });

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAvatarConfirm, setShowDeleteAvatarConfirm] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.email) fetchUser();
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAvatarLightbox(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
    }
  }, [user]);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login');
  };
  const handleEditToggle = () => {
    if (editing) {
      setFirstName(user?.first_name ?? '');
      setLastName(user?.last_name ?? '');
      setSaveError(null);
    }
    setEditing((e) => !e);
    setSaveSuccess(false);
  };
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile({ first_name: firstName, last_name: lastName });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
    } catch {
      setAvatarError('Не удалось загрузить аватар');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };
  const handleDeleteAvatar = async () => {
    setShowDeleteAvatarConfirm(false);
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      await deleteAvatar();
    } catch {
      setAvatarError('Не удалось удалить аватар');
    } finally {
      setAvatarUploading(false);
    }
  };

  const avatarUrl = user?.profile?.avatar_url;
  const initials =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .map((s) => s![0].toUpperCase())
      .join('') ||
    user?.username?.[0]?.toUpperCase() ||
    '?';
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || '';

  return (
    <>
      {/* Lightbox */}
      {avatarLightbox && avatarUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={() => setAvatarLightbox(false)}
        >
          <div
            className="relative flex flex-col items-center gap-4 slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-72 h-72 rounded-full object-cover ring-4 ring-white/20 shadow-2xl"
            />
            {displayName && (
              <p className="text-white font-semibold text-lg drop-shadow">{displayName}</p>
            )}
            <button
              onClick={() => setAvatarLightbox(false)}
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
      )}

      <div className="max-w-3xl mx-auto slide-up">
        <div className="glass overflow-hidden">
          {/* Header band */}
          <div
            className="h-24"
            style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)' }}
          />

          <div className="px-8 pb-8">
            {/* Avatar + actions row */}
            <div className="flex items-end justify-between -mt-12 mb-6">
              <div className="relative group">
                <div
                  className="w-24 h-24 rounded-full ring-4 overflow-hidden flex items-center justify-center text-3xl font-bold select-none"
                  style={
                    {
                      background: avatarUrl ? 'var(--accent-soft)' : 'var(--avatar-placeholder-bg)',
                      color: avatarUrl ? 'var(--accent)' : 'var(--avatar-placeholder-color)',
                      '--tw-ring-color': 'var(--bg-base)',
                    } as React.CSSProperties
                  }
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {!avatarUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    {avatarUrl && (
                      <button
                        onClick={() => setAvatarLightbox(true)}
                        title="Просмотреть"
                        className="p-1.5 bg-white/90 rounded-full text-gray-700 hover:bg-white transition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      title="Загрузить"
                      className="p-1.5 bg-white/90 rounded-full text-gray-700 hover:bg-white transition"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4"
                        />
                      </svg>
                    </button>
                    {avatarUrl && (
                      <button
                        onClick={() => setShowDeleteAvatarConfirm(true)}
                        title="Удалить"
                        className="p-1.5 bg-white/90 rounded-full hover:bg-white transition"
                        style={{ color: 'var(--error)' }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="flex gap-2 mt-2">
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      Сохранить
                    </button>
                    <button
                      onClick={handleEditToggle}
                      className="btn-ghost px-4 py-2 rounded-lg text-sm"
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="btn-ghost px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.94l-3 1 1-3a4 4 0 01.94-1.414z"
                      />
                    </svg>
                    Редактировать
                  </button>
                )}
              </div>
            </div>

            {/* Alerts */}
            {avatarError && (
              <div
                className="mb-4 p-3 rounded-lg text-sm"
                style={{
                  background: 'var(--error-soft)',
                  border: '1px solid var(--error)',
                  color: 'var(--error)',
                }}
              >
                {avatarError}
              </div>
            )}
            {saveError && (
              <div
                className="mb-4 p-3 rounded-lg text-sm"
                style={{
                  background: 'var(--error-soft)',
                  border: '1px solid var(--error)',
                  color: 'var(--error)',
                }}
              >
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div
                className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
                style={{
                  background: 'var(--success-soft)',
                  border: '1px solid var(--success)',
                  color: 'var(--success)',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Профиль успешно обновлён
              </div>
            )}

            {/* Profile fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassField label="Имя пользователя" value={user?.username ?? '—'} readOnly />
              <GlassField label="Email" value={user?.email ?? '—'} readOnly />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Имя
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Введите имя"
                    className="text-sm"
                    style={{ borderColor: 'var(--accent)' }}
                  />
                ) : (
                  <p
                    className="px-3 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {user?.first_name || (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        не указано
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Фамилия
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Введите фамилию"
                    className="text-sm"
                    style={{ borderColor: 'var(--accent)' }}
                  />
                ) : (
                  <p
                    className="px-3 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {user?.last_name || (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        не указано
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Роль
                </label>
                <div
                  className="px-3 py-2 rounded-lg"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}
                >
                  <RoleBadge role={user?.profile?.role} display={user?.profile?.role_display} />
                </div>
              </div>
            </div>

            {/* AI stats */}
            {user?.profile && (
              <div
                className="mt-6 p-5 rounded-xl"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}
              >
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Статистика запросов к AI
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Использовано сегодня
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {user.profile.role === 'user'
                        ? `${user.profile.daily_requests_used} / ${user.profile.daily_requests_limit}`
                        : '∞'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Доступные модели
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {user.profile.available_models === 'all'
                        ? 'Все'
                        : user.profile.available_models?.length || 1}
                    </div>
                  </div>
                </div>
                {user.profile.role === 'user' && (
                  <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    💡 Обновите до Premium для неограниченных запросов и доступа ко всем моделям!
                  </p>
                )}
              </div>
            )}

            {/* Admin link */}
            {user?.profile?.role === 'admin' && (
              <div className="mt-5 flex justify-center">
                <Link
                  to="/admin"
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, var(--accent))',
                    boxShadow: '0 2px 12px rgba(139,92,246,0.3)',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                  Панель администратора
                </Link>
              </div>
            )}

            {/* Bottom actions */}
            <div className="mt-8 flex gap-3 justify-center">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="btn-danger-ghost px-5 py-2 rounded-lg text-sm"
              >
                Выйти
              </button>
              <Link to="/" className="btn-primary px-5 py-2 rounded-lg text-sm">
                На главную
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Logout confirmation */}
      <GlassConfirmModal
        open={showLogoutConfirm}
        title="Выйти из аккаунта?"
        message="Вы уверены, что хотите выйти? Вам нужно будет войти снова."
        confirmLabel="Выйти"
        cancelLabel="Отмена"
        variant="warning"
        icon="🚪"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Delete avatar confirmation */}
      <GlassConfirmModal
        open={showDeleteAvatarConfirm}
        title="Удалить аватар?"
        message="Текущий аватар будет удалён. Вы сможете загрузить новый позже."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        icon="🗑️"
        onConfirm={handleDeleteAvatar}
        onCancel={() => setShowDeleteAvatarConfirm(false)}
      />
    </>
  );
}

function GlassField({
  label,
  value,
  readOnly,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <p
        className="px-3 py-2 rounded-lg text-sm"
        style={{
          background: readOnly ? 'var(--bg-surface)' : 'var(--glass-bg)',
          border: '1px solid var(--border)',
          color: readOnly ? 'var(--text-muted)' : 'var(--text-primary)',
          cursor: readOnly ? 'not-allowed' : 'default',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function RoleBadge({ role, display }: { role?: string; display?: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    admin: { bg: 'var(--error-soft)', color: 'var(--error)' },
    premium: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
    user: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  };
  const s = styles[role ?? 'user'] ?? styles.user;
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {display ?? role ?? '—'}
    </span>
  );
}
