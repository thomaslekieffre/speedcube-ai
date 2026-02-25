import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate data JSON files into their own chunk (lazy-loaded)
          if (id.includes('/src/data/') && !id.includes('metadata')) {
            return 'data';
          }
          // Separate framer-motion
          if (id.includes('framer-motion')) {
            return 'framer';
          }
          // Let cubing.js handle its own code-splitting (3D renderer, puzzles)
        },
      },
    },
  },
})
