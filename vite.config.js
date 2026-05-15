import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://chuchinator.github.io/pokemon-app/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/pokemon-app/' : '/',
  server: {
    host: true,
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true,
      },
    },
  },
}));
