import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Слушать на всех интерфейсах (0.0.0.0)
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Для работы hot reload в Docker
    },
  },
});
