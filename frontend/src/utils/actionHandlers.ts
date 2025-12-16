import { type NavigateFunction } from 'react-router-dom';
import { actions, type ThemeValue, type RouteValue } from './actions';

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
 * Фабрика действий - создает словарь обработчиков,
 * используя заранее объявленные actions (без прямой передачи switchTheme)
 */
export const createActionHandlers = (navigate: NavigateFunction): ActionHandlers => ({
  // Навигация
  '001': () => applyRoute(navigate, actions.goHome()),
  '002': () => applyRoute(navigate, actions.goLogin()),
  '003': () => applyRoute(navigate, actions.goRegister()),
  '004': () => applyRoute(navigate, actions.goDashboard()),
  '005': () => applyRoute(navigate, actions.goAbout()),
  '006': () => applyRoute(navigate, actions.goForgotPassword()),
  '007': () => applyRoute(navigate, actions.goProfile()),
  '008': () => applyRoute(navigate, actions.goSettings()),

  // Тема
  '100': () => applyTheme(actions.setDarkTheme()),
  '101': () => applyTheme(actions.setLightTheme()),
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
