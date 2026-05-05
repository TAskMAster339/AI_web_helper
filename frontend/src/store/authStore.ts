import { isAxiosError } from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

interface UserProfile {
  role: 'user' | 'premium' | 'admin';
  role_display: string;
  daily_requests_limit: number;
  daily_requests_used: number;
  can_make_request: boolean;
  requests_remaining: number | 'unlimited';
  available_models: string[] | 'all';
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

interface ApiError {
  detail?: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface AuthStore {
  user: User | null;
  access_token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  register: (username: string, email: string, password: string, password2: string) => Promise<void>;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateProfile: (data: { first_name?: string; last_name?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
  refreshAccessToken: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

interface TokenResponse {
  user: User;
  access: string;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      access_token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false, // Регистрация аккаунта
      register: async (username, email, password, password2) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/users/register/', {
            username,
            email,
            password,
            password2,
          });

          // После успешной регистрации не сохраняем токен,
          // так как пользователь должен активировать аккаунт через email
          set({
            isLoading: false,
          });
        } catch (error: unknown) {
          let message = 'Ошибка регистрации';

          if (isAxiosError<ApiError>(error)) {
            const detail = error.response?.data?.detail;
            if (typeof detail === 'string') {
              message = detail;
            } else if (typeof detail === 'object' && detail !== null) {
              message = Object.values(detail).join(', ');
            }
          }

          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // Вход по логину или почте
      login: async (login, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<TokenResponse>('/users/login/', {
            login,
            password,
          });

          const { user, access } = response.data;
          localStorage.setItem('access_token', access);

          set({
            user,
            access_token: access,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          let message = 'Ошибка входа';

          if (isAxiosError<ApiError>(error)) {
            message = error.response?.data?.detail || message;
          }

          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/users/logout/');
        } catch {
          // Игнорируем, если пользователь не вошёл.
        } finally {
          localStorage.removeItem('access_token');
          set({
            user: null,
            access_token: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },
      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get<User>('/users/me/');
          set({ user: response.data, isLoading: false, isAuthenticated: true });
        } catch (error: unknown) {
          localStorage.removeItem('access_token');
          set({ isLoading: false, isAuthenticated: false, user: null, access_token: null });
          throw error;
        }
      },

      // Тихое обновление профиля пользователя без показа loading
      refreshUserProfile: async () => {
        try {
          const response = await api.get<User>('/users/me/');
          set({ user: response.data, isAuthenticated: true });
        } catch (error: unknown) {
          console.error('Failed to refresh user profile:', error);
        }
      },

      updateProfile: async (data) => {
        // Не трогаем глобальный isLoading — иначе App.tsx размонтирует Router
        try {
          const response = await api.patch<User>('/users/me/', data);
          set({ user: response.data });
        } catch (error: unknown) {
          let message = 'Ошибка обновления профиля';
          if (isAxiosError<ApiError>(error)) {
            const detail = error.response?.data?.detail;
            if (typeof detail === 'string') message = detail;
          }
          set({ error: message });
          throw error;
        }
      },

      uploadAvatar: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<User>('/users/me/avatar/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        set({ user: response.data });
      },

      deleteAvatar: async () => {
        const response = await api.delete<User>('/users/me/avatar/');
        set({ user: response.data });
      },

      setUser: (user) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },

      refreshAccessToken: async () => {
        try {
          const response = await api.post<{ access: string }>('/users/token/refresh/');
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          set({ access_token: access });
        } catch (error) {
          get().logout();
          throw error;
        }
      },
      initializeAuth: async () => {
        set({ isLoading: true });
        try {
          const state = get();

          // Ensure we pick up token saved by login even if the persisted store hasn't rehydrated yet
          // (can happen across reloads in some browsers/e2e contexts).
          const storedAccess = localStorage.getItem('access_token');
          if (!state.access_token && storedAccess) {
            set({ access_token: storedAccess });
          }

          const nextState = get();
          if (nextState.access_token) {
            await get().fetchUser();
          } else {
            // Если токена нет, явно устанавливаем isAuthenticated = false
            set({ isAuthenticated: false });
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          localStorage.removeItem('access_token');
          set({ isAuthenticated: false, user: null, access_token: null });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        access_token: state.access_token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
