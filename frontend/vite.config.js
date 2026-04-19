import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    charset: 'utf8',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Manuelles Chunking: Vendor-Libs in eigene Chunks, damit Pages
        // geladen werden können ohne React/Supabase/i18n zu blockieren.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) return 'vendor-react';
          if (id.includes('@supabase') || id.includes('gotrue')) return 'vendor-supabase';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
          if (id.includes('@capacitor')) return 'vendor-capacitor';
          if (id.includes('axios')) return 'vendor-axios';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('date-fns') || id.includes('dayjs')) return 'vendor-dates';
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('browser-image-compression') || id.includes('heic2any') || id.includes('pdf-lib') || id.includes('jspdf')) return 'vendor-pdf-img';
          if (id.includes('recharts') || id.includes('victory') || id.includes('d3-')) return 'vendor-charts';
          return 'vendor-misc';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})