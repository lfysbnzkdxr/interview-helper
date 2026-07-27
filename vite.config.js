import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue')) return 'vue-framework'
          if (id.includes('node_modules/marked')) return 'marked'
          if (id.includes('node_modules/idb')) return 'idb'
          if (id.includes('node_modules/dompurify')) return 'dompurify'
        },
      },
    },
  },
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
