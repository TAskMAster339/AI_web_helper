import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, fetchUser, updateProfile, uploadAvatar, deleteAvatar } = useAuthStore();

  // ── Edit state ────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Avatar state ──────────────────────────────────────────────
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.email) fetchUser();
  }, []);

  // Close lightbox on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAvatarLightbox(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Sync form fields when user loads or editing starts
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleEditToggle = () => {
    if (editing) {
      // cancel — reset to current values
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
      // reset input so same file can be re-selected
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
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
      {/* ── Avatar lightbox ── */}
      {avatarLightbox && avatarUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setAvatarLightbox(false)}
        >
          <div
            className="relative flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-72 h-72 rounded-full object-cover ring-4 ring-white/30 shadow-2xl"
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

      <div className="max-w-3xl mx-auto p-6 mt-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* ── Header band ── */}
          <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />

          {/* ── Avatar + name row ── */}
          <div className="px-8 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-full ring-4 ring-white dark:ring-gray-900 overflow-hidden bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-3xl font-bold text-blue-600 dark:text-blue-300 select-none">
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
                {/* Overlay buttons on hover */}
                {!avatarUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    {avatarUrl && (
                      <button
                        onClick={() => setAvatarLightbox(true)}
                        title="Просмотреть фото"
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
                      title="Загрузить фото"
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
                        onClick={handleDeleteAvatar}
                        title="Удалить фото"
                        className="p-1.5 bg-white/90 rounded-full text-red-600 hover:bg-white transition"
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

              {/* Edit / Save button */}
              <div className="flex gap-2 mt-2">
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex items-center gap-1.5"
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
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5"
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
              <div className="mb-4 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {avatarError}
              </div>
            )}
            {saveError && (
              <div className="mb-4 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="mb-4 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center gap-2">
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

            {/* ── Profile fields ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Username — read only */}
              <Field label="Имя пользователя" value={user?.username ?? '—'} readOnly />
              {/* Email — read only */}
              <Field label="Email" value={user?.email ?? '—'} readOnly />

              {/* First name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Имя</label>
                {editing ? (
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Введите имя"
                    className="px-3 py-2 rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {user?.first_name || (
                      <span className="text-gray-400 font-normal">не указано</span>
                    )}
                  </p>
                )}
              </div>

              {/* Last name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Фамилия
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Введите фамилию"
                    className="px-3 py-2 rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {user?.last_name || (
                      <span className="text-gray-400 font-normal">не указано</span>
                    )}
                  </p>
                )}
              </div>

              {/* Role — read only */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Роль</label>
                <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <RoleBadge role={user?.profile?.role} display={user?.profile?.role_display} />
                </div>
              </div>
            </div>

            {/* ── AI stats ── */}
            {user?.profile && (
              <div className="mt-6 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                  Статистика запросов к AI
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Использовано сегодня
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {user.profile.role === 'user'
                        ? `${user.profile.daily_requests_used} / ${user.profile.daily_requests_limit}`
                        : '∞'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Доступные модели</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {user.profile.available_models === 'all'
                        ? 'Все'
                        : user.profile.available_models?.length || 1}
                    </div>
                  </div>
                </div>
                {user.profile.role === 'user' && (
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    💡 Обновите до Premium для неограниченных запросов и доступа ко всем моделям!
                  </p>
                )}
              </div>
            )}

            {/* ── Admin link ── */}
            {user?.profile?.role === 'admin' && (
              <div className="mt-5">
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-md text-sm font-semibold"
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

            {/* ── Bottom actions ── */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={handleLogout}
                className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Выйти
              </button>
              <Link
                to="/"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow"
              >
                На главную
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Helper components ─────────────────────────────────────────

function Field({ label, value, readOnly }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <p
        className={`px-3 py-2 rounded-lg border text-sm font-semibold text-gray-900 dark:text-gray-100 ${
          readOnly
            ? 'bg-gray-100 dark:bg-gray-700/60 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-normal cursor-not-allowed'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function RoleBadge({ role, display }: { role?: string; display?: string }) {
  const colors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    premium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  };
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[role ?? 'user'] ?? colors.user}`}
    >
      {display ?? role ?? '—'}
    </span>
  );
}
