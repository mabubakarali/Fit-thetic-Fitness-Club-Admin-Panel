import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: [
        '**/*.tmp',
        '**/*.~tmp',
        '**/*.TMP',
        '**/*.exe',
        '**/*.bat',
        '**/*.vbs',
        '**/*.cs',
        '**/dist/**',
        '**/dist-electron/**',
        '**/member-app-phase2/**',
        '**/.app-session/**',
      ],
    },
  },
});
