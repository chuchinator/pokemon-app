import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://chuchinator.github.io/pokemon-app/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/pokemon-app/' : '/',
});
