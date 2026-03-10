import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

interface UserProfile {
  role: 'user' | 'premium' | 'admin';
  role_display: string;
  daily_requests_limit: number;
  daily_requests_used: number;
  avatar_url: string | null;
}

interface PublicUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile: UserProfile;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  premium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin edit state
  const isAdmin = currentUser?.profile?.role === 'admin';
  const [editing, setEditing] = useState(false);
  const [editRole, setEditRole] = useState<'user' | 'premium' | 'admin'>('user');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Lightbox
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api
      .get<PublicUser>(`/users/${userId}/`)
      .then((res) => {
        setProfileUser(res.data);
        setEditRole(res.data.profile.role);
        setEditFirstName(res.data.first_name);
        setEditLastName(res.data.last_name);
      })
      .catch(() => setError('Пользователь не найден'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    if (!profileUser) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.patch<PublicUser>(`/users/${profileUser.id}/`, {
        role: editRole,
        first_name: editFirstName,
        last_name: editLastName,
      });
      setProfileUser(res.data);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profileUser) return;
    setEditRole(profileUser.profile.role);
    setEditFirstName(profileUser.first_name);
    setEditLastName(profileUser.last_name);
    setSaveError(null);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-10 animate-pulse">
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4" />
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-10 text-center">
        <p className="text-red-500 text-lg mb-4">{error ?? 'Пользователь не найден'}</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          ← Назад
        </button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const avatarUrl = profileUser.profile.avatar_url;
  const displayName = profileUser.full_name || profileUser.username;
  const initials =
    [profileUser.first_name, profileUser.last_name]
      .filter(Boolean)
      .map((s) => s[0].toUpperCase())
      .join('') ||
    profileUser.username[0]?.toUpperCase() ||
    '?';

  return (
    <>
      {/* Lightbox */}
      {lightbox && avatarUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <div
            className="relative flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-72 h-72 rounded-full object-cover ring-4 ring-white/30 shadow-2xl"
            />
            <p className="text-white font-semibold text-lg drop-shadow">{displayName}</p>
            <button
              onClick={() => setLightbox(false)}
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
      )}

      <div className="max-w-2xl mx-auto p-6 mt-10">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Назад
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header band */}
          <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600" />

          <div className="px-8 pb-8">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-12 mb-6">
              {/* Avatar */}
              <div
                className={`w-24 h-24 rounded-full ring-4 ring-white dark:ring-gray-900 overflow-hidden bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-3xl font-bold text-blue-600 dark:text-blue-300 select-none ${avatarUrl ? 'cursor-pointer' : ''}`}
                onClick={() => avatarUrl && setLightbox(true)}
                title={avatarUrl ? 'Нажмите для просмотра' : undefined}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Admin actions */}
              <div className="flex gap-2 mt-2">
                {isOwnProfile && (
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    Редактировать профиль
                  </Link>
                )}
                {isAdmin && !isOwnProfile && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5"
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
                {isAdmin && editing && (
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
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      Отмена
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Alerts */}
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
                Профиль обновлён
              </div>
            )}

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Username */}
              <ReadonlyField label="Имя пользователя" value={profileUser.username} />

              {/* Email — only visible to admin or own */}
              {(isAdmin || isOwnProfile) && (
                <ReadonlyField label="Email" value={profileUser.email} />
              )}

              {/* First name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Имя</label>
                {editing ? (
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="Введите имя"
                    className="px-3 py-2 rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {profileUser.first_name || (
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
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Введите фамилию"
                    className="px-3 py-2 rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {profileUser.last_name || (
                      <span className="text-gray-400 font-normal">не указано</span>
                    )}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Роль</label>
                {editing ? (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as typeof editRole)}
                    className="px-3 py-2 rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">Обычный пользователь</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Администратор</option>
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[profileUser.profile.role] ?? ROLE_COLORS.user}`}
                    >
                      {profileUser.profile.role_display}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <p className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700/60 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed">
        {value}
      </p>
    </div>
  );
}
