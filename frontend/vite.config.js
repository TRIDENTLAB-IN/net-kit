import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = 'http://127.0.0.1:41990'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Go backend during dev so the React app
      // always talks to a single origin.
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
