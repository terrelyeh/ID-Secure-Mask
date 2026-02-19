import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // pdfjs-dist 使用了 top-level await 語法，需要設定 target 為 esnext 才能正確打包
    target: 'esnext',
  },
});