import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  publicDir: 'public', // publicディレクトリを指定
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/desktop/desktop.js'),
      name: 'KintonePlugin',
      fileName: () => 'desktop.js',
      formats: ['iife']
    },
    rollupOptions: {
      // kintone-plugin-packer が external な URL を解決できないため、
      // Chart.js はバンドルに含めず、manifest.json で別途読み込む
      external: [
        'https://cdn.jsdelivr.net/npm/chart.js'
      ],
      output: {
        globals: {
          'https://cdn.jsdelivr.net/npm/chart.js': 'Chart'
        }
      }
    }
  }
});
