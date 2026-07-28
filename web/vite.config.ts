import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // maplibre-gl ships a worker bundle that Vite's dep pre-optimizer
  // mishandles (404s at dev time); excluding it from optimizeDeps lets
  // the browser load it directly instead.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  worker: {
    format: 'es',
  },
})
