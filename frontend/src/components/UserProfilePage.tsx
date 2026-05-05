import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import GlassConfirmModal from './GlassConfirmModal';

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

/* ── Role badge ── */
function RoleBadge({ role, label }: { role: string; label: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    admin: { bg: 'var(--error-soft)', color: 'var(--error)' },
    premium: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
    user: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  };
  const t = map[role] ?? map.user;
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: t.bg, color: t.color }}
    >
      {label}
    </span>
  );
}

/* ── Readonly glass field ── */
function GlassField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <p
        className="px-3 py-2 rounded-lg text-sm"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: muted ? 'var(--text-muted)' : 'var(--text-primary)',
          cursor: muted ? 'not-allowed' : undefined,
        }}
      >
        {value}
      </p>
    </div>
  );
}

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
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

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

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-10 animate-pulse">
        <div className="h-24 rounded-2xl mb-4" style={{ background: 'var(--bg-surface)' }} />
        <div className="h-40 rounded-2xl" style={{ background: 'var(--bg-surface)' }} />
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !profileUser) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-10 text-center">
        <p className="text-lg mb-4" style={{ color: 'var(--error)' }}>
          {error ?? 'Пользователь не найден'}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium transition-colors"
          style={{ color: 'var(--accent)' }}
        >
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
      {/* ── Lightbox ── */}
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
              className="w-72 h-72 rounded-full object-cover shadow-2xl"
              style={{ boxShadow: '0 0 0 4px var(--accent-glow)' }}
            />
            <p className="text-white font-semibold text-lg drop-shadow">{displayName}</p>
            <button
              onClick={() => setLightbox(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
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

      <div className="max-w-2xl mx-auto p-6 mt-10 slide-up">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors mb-6"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
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

        <div className="glass overflow-hidden">
          {/* Header band */}
          <div
            className="h-24"
            style={{ background: 'linear-gradient(135deg, var(--accent), #a855f7)' }}
          />

          <div className="px-8 pb-8">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-12 mb-6">
              {/* Avatar */}
              <div
                className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold select-none ${avatarUrl ? 'cursor-pointer' : ''}`}
                style={{
                  background: avatarUrl ? 'var(--accent-soft)' : 'var(--avatar-placeholder-bg)',
                  color: avatarUrl ? 'var(--accent)' : 'var(--avatar-placeholder-color)',
                  boxShadow: '0 0 0 4px var(--bg-base)',
                }}
                onClick={() => avatarUrl && setLightbox(true)}
                title={avatarUrl ? 'Нажмите для просмотра' : undefined}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                {isOwnProfile && (
                  <Link to="/dashboard" className="btn-ghost px-4 py-2 text-sm rounded-lg">
                    Редактировать профиль
                  </Link>
                )}
                {isAdmin && !isOwnProfile && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="btn-ghost px-4 py-2 text-sm rounded-lg flex items-center gap-1.5"
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
                      onClick={() => setShowSaveConfirm(true)}
                      disabled={saving}
                      className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5"
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
                      className="btn-ghost px-4 py-2 text-sm rounded-lg"
                    >
                      Отмена
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Alerts */}
            {saveError && (
              <div
                className="mb-4 px-4 py-2.5 rounded-lg text-sm"
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
                className="mb-4 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"
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
                Профиль обновлён
              </div>
            )}

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Username */}
              <GlassField label="Имя пользователя" value={profileUser.username} muted />

              {/* Email — only visible to admin or own */}
              {(isAdmin || isOwnProfile) && (
                <GlassField label="Email" value={profileUser.email} muted />
              )}

              {/* First name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Имя
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="Введите имя"
                  />
                ) : (
                  <p
                    className="px-3 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {profileUser.first_name || (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        не указано
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Last name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Фамилия
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Введите фамилию"
                  />
                ) : (
                  <p
                    className="px-3 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {profileUser.last_name || (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        не указано
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Роль
                </label>
                {editing ? (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as typeof editRole)}
                  >
                    <option value="user">Обычный пользователь</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Администратор</option>
                  </select>
                ) : (
                  <div
                    className="px-3 py-2 rounded-lg"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  >
                    <RoleBadge
                      role={profileUser.profile.role}
                      label={profileUser.profile.role_display}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save confirmation modal */}
      <GlassConfirmModal
        open={showSaveConfirm}
        title="Сохранить изменения?"
        message={`Профиль пользователя «${profileUser.username}» будет обновлён. Продолжить?`}
        confirmLabel="Сохранить"
        cancelLabel="Отмена"
        variant="info"
        icon="💾"
        onConfirm={() => {
          setShowSaveConfirm(false);
          handleSave();
        }}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </>
  );
}
