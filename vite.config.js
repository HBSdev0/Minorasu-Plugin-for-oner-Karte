import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  publicDir: 'public', // publicディレクトリを指定
  build: {
    outDir: 'dist',
    minify: 'terser', // 難読化を有効化
    terserOptions: {
      compress: {
        drop_console: false, // console.logを残す
        drop_debugger: true,
        pure_funcs: ['console.log'] // console.logは残すが、他のconsoleは削除
      },
      mangle: {
        toplevel: true, // トップレベルの変数名を難読化
        keep_fnames: false // 関数名も難読化
      }
    },
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
