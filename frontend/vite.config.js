import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/telegram': 'http://localhost:8000',
      '/settings': 'http://localhost:8000',
      '/logs': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    }
  }
})
