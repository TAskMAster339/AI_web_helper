import type { Config } from 'tailwindcss';

export default {
  darkMode: 'selector', // Использовать .dark класс вместо prefers-color-scheme
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
} satisfies Config;
