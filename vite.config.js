import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    hmr: false,
    watch: null,
    proxy: {
      '/api': {
        target: 'https://interview-helper-59v.pages.dev',
        changeOrigin: true,
      },
    },
  },
})
