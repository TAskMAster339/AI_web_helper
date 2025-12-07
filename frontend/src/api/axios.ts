import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

// Extend InternalAxiosRequestConfig to include _retry
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function getCookie(name: string): string | null {
  const cookieString = document.cookie || '';
  const cookies = cookieString.split('; ');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Перехватчик для добавления авторизации и CSRF токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Флаг для контроля повторного запроса
let isRefreshing = false;
let failedQueue: Array<[(value: unknown) => void, (reason?: unknown) => void]> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(([resolve, reject]) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    // Условие 401 и не refresh
    if (
      error.response?.status === 401 &&
      !(originalRequest as CustomAxiosRequestConfig)?._retry &&
      !originalRequest?.url?.includes('/token/refresh/')
    ) {
      if (isRefreshing) {
        // Если сейчас уже идет refresh, ждем результат, чтобы не вызывать заново
        return new Promise((resolve, reject) => {
          failedQueue.push([resolve, reject]);
        })
          .then((token) => {
            if (originalRequest?.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest as AxiosRequestConfig);
          })
          .catch((err) => Promise.reject(err));
      }

      if (originalRequest) {
        (originalRequest as CustomAxiosRequestConfig)._retry = true; // кастомное поле для отслеживания повторного запроса
      }
      isRefreshing = true;
      try {
        const response = await api.post('/users/token/refresh/');
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        processQueue(null, access);
        if (originalRequest?.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        isRefreshing = false;
        return api(originalRequest as AxiosRequestConfig);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        localStorage.removeItem('access_token');
        isRefreshing = false;
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
