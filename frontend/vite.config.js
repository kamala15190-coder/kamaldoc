import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    charset: 'utf8'
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
    hmr: {
      // Feste WebSocket-Verbindung über den Server-Host
      // Verhindert dass HMR auf Mobile einen Full-Page-Reload auslöst
      protocol: 'ws',
      host: '100.77.198.89',
      port: 5173,
    },
  },
})