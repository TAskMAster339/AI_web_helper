export const actions = {
  // Навигация — только строки маршрутов
  goHome: () => '/',

  goLogin: () => '/login',
  goRegister: () => '/register',
  goDashboard: () => '/dashboard',
  goAbout: () => '/about',
  goForgotPassword: () => '/forgot-password',
  goProfile: () => '/profile',
  goSettings: () => '/settings',

  // Тема — только строка темы
  setDarkTheme: () => 'dark' as const,
  setLightTheme: () => 'light' as const,
};

export type ThemeValue =
  | ReturnType<typeof actions.setDarkTheme>
  | ReturnType<typeof actions.setLightTheme>;

export type RouteValue = ReturnType<typeof actions.goHome>;
