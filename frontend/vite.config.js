import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In Docker the target is the backend *service name* (http://backend:8000); outside Docker it is localhost.
const target = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true, proxy: { '/api': { target, changeOrigin: true } } },
  preview: { port: 5173, host: true, proxy: { '/api': { target, changeOrigin: true } } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.js' },
})
