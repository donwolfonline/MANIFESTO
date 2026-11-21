import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { contentPlugin } from './vite-content-plugin';

const plugins: PluginOption[] = [contentPlugin(), react(), tailwindcss()];

if (process.env.ANALYZE === 'true') {
  plugins.push(
    visualizer({
      filename: 'dist/bundle-stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  );
}

export default defineConfig({
  plugins,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
          if (
            id.includes('/node_modules/framer-motion/') ||
            id.includes('/node_modules/motion-dom/') ||
            id.includes('/node_modules/motion-utils/')
          ) {
            return 'vendor-motion';
          }
          if (id.includes('/node_modules/shiki/') || id.includes('/node_modules/@shikijs/')) {
            return 'vendor-shiki';
          }
          return undefined;
        },
      },
    },
  },
});
