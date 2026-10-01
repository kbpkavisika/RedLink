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
        // The browser only talks to Vite (same origin), but it still sends "Origin: http://localhost:5173"
        // on POST/PATCH. Forwarded as-is, Spring's CORS check sees a foreign origin and answers
        // 403 "Invalid CORS request". Sending the backend's own origin makes it a same-origin request,
        // so development needs no CORS settings.
        headers: { origin: 'http://localhost:8080' },
      },
    },
  },
})
