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
        // Manuelles Chunking NUR für Leaf-Libraries ohne interne Deps auf React-Ökosystem.
        // React/React-DOM/React-Router NICHT splitten – die Abhängigkeits-Kette
        // (react-router → Activity) erwartet synchrone Co-Evaluierung, sonst Runtime-TypeError.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@capacitor')) return 'vendor-capacitor';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('browser-image-compression') || id.includes('heic2any') || id.includes('pdf-lib') || id.includes('jspdf')) return 'vendor-pdf-img';
          if (id.includes('recharts') || id.includes('victory') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          // Alles andere (React, React-Router, Supabase, i18next, axios) bleibt im Haupt-Bundle
          // bzw. wird von Rollup automatisch gechunkt.
          return undefined;
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