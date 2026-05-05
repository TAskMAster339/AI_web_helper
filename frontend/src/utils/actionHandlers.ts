import { type NavigateFunction } from 'react-router-dom';
import { actions, type RouteValue, type ThemeValue } from './actions';

/**
 * Тип обработчика действия - может быть синхронной или асинхронной функцией
 */
export type ActionHandler = () => Promise<void> | void;

/**
 * Интерфейс для словаря обработчиков действий
 * Ключ - код действия (из LLM), значение - функция обработчика
 */
export interface ActionHandlers {
  [key: string]: ActionHandler;
}

/**
 * Реализация применения темы
 */
const applyTheme = (value: ThemeValue) => {
  const root = document.documentElement;
  if (value === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('theme', value);
};

/**
 * Реализация навигации
 */
const applyRoute = (navigate: NavigateFunction, value: RouteValue) => {
  navigate(value);
};

/**
 * Построить URL каталога с фильтрами из LLM-ответа.
 * Пример: /products?min_price=500&max_price=1000&search=телефон
 */
export const buildProductsUrl = (filters?: Record<string, string | number | boolean>): string => {
  const base = actions.goProducts();
  if (!filters || Object.keys(filters).length === 0) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, String(value));
  }
  return `${base}?${params.toString()}`;
};

/**
 * Построить URL главной страницы с городом для виджета погоды.
 */
export const buildWeatherUrl = (city?: string): string => {
  if (!city) return actions.goHome();
  return `${actions.goHome()}?city=${encodeURIComponent(city)}`;
};

/**
 * Фабрика действий - создает словарь обработчиков.
 * Для действия '004' принимает опциональные filters из LLM-ответа.
 * Для действия '007' принимает опциональный weather_city из LLM-ответа.
 * Для действий '200'/'201' принимает коллбэки управления чатом.
 */
export const createActionHandlers = (
  navigate: NavigateFunction,
  filters?: Record<string, string | number | boolean>,
  weatherCity?: string,
  chatCallbacks?: { closeChat?: () => void; clearChat?: () => void }
): ActionHandlers => ({
  // Навигация (только маршруты, доступные авторизованному пользователю)
  '001': () => applyRoute(navigate, actions.goHome()),
  '002': () => applyRoute(navigate, actions.goDashboard()),
  '003': () => applyRoute(navigate, actions.goAbout()),
  '004': () => navigate(buildProductsUrl(filters)),
  '005': () => applyRoute(navigate, actions.goProductsNew()),
  '006': () => applyRoute(navigate, actions.goAdmin()),
  '007': () => navigate(buildWeatherUrl(weatherCity)),

  // Тема
  '100': () => applyTheme(actions.setDarkTheme()),
  '101': () => applyTheme(actions.setLightTheme()),

  // Управление чатом
  '200': () => chatCallbacks?.closeChat?.(),
  '201': () => chatCallbacks?.clearChat?.(),
});

/**
 * Проверить, существует ли обработчик для кода действия
 */
export const hasActionHandler = (actionCode: string, handlers: ActionHandlers): boolean => {
  return actionCode in handlers;
};

/**
 * Получить обработчик для кода действия с fallback
 */
export const getActionHandler = (
  actionCode: string,
  handlers: ActionHandlers,
  fallback?: ActionHandler
): ActionHandler | undefined => {
  return handlers[actionCode] || fallback;
};

/**
 * Выполнить действие с обработкой ошибок
 */
export const executeAction = async (
  actionCode: string,
  handlers: ActionHandlers,
  onError?: (error: Error) => void
): Promise<boolean> => {
  try {
    const handler = handlers[actionCode];
    if (!handler) {
      console.warn(`No handler found for action code: ${actionCode}`);
      return false;
    }

    await handler();
    return true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error(`Error executing action ${actionCode}:`, err);
    onError?.(err);
    return false;
  }
};
