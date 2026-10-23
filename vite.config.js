import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    open: true,
    // in development, forward API calls to the Express server
    proxy: {
      '/chat': 'http://localhost:3001',
      '/feedback': 'http://localhost:3001',
    },
  },
});
