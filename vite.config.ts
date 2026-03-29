import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/n8n-chat': {
        target: 'https://n8n-m287.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/n8n-chat/, ''),
      },
    },
  },
})
