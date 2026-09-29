import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173, // Runs frontend
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // Springboot runs on port 8080 by default, backend
        changeOrigin: true,
      },
    },
  },
})
