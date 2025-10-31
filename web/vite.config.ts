import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
}));


