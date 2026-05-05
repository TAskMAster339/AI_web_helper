export const actions = {
  // Навигация — точные маршруты из App.tsx (только для авторизованных)
  goHome: () => '/',
  goDashboard: () => '/dashboard',
  goAbout: () => '/about',
  goProducts: () => '/products',
  goProductsNew: () => '/products/new',
  goAdmin: () => '/admin',

  // Тема — строка значения
  setDarkTheme: () => 'dark' as const,
  setLightTheme: () => 'light' as const,
};

export type ThemeValue =
  | ReturnType<typeof actions.setDarkTheme>
  | ReturnType<typeof actions.setLightTheme>;

export type RouteValue = ReturnType<typeof actions.goHome>;
