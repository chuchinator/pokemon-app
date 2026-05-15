import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://chuchinator.github.io/pokemon-app/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/pokemon-app/' : '/',
}));
