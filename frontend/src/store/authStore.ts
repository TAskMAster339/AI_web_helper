import { isAxiosError } from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
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
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
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
      isAuthenticated: false,
      register: async (username, email, password, password2) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<TokenResponse>('/users/register/', {
            username,
            email,
            password,
            password2,
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
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<TokenResponse>('/users/login/', {
            username,
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
      logout: () => {
        localStorage.removeItem('access_token');
        set({
          user: null,
          access_token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get<User>('/users/me/');
          set({ user: response.data, isLoading: false, isAuthenticated: true });
        } catch (error: unknown) {
          set({ isLoading: false, isAuthenticated: false });
          throw error;
        }
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
          if (state.access_token) {
            await get().fetchUser();
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
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
