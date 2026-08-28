import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    
   outDir: './backend/public',
    
    emptyOutDir: true, 

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            if (id.includes('@fortawesome')) {
              return 'vendor-fontawesome';
            }
            if (id.includes('react-bootstrap') || id.includes('bootstrap')) {
              return 'vendor-bootstrap';
            }
            return 'vendor-core';
          }
        }
      }
    }
  }
})