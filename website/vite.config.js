import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Served by GitHub Pages under /ets-server-updater/. Clean URLs (no #) work through 404.html, a copy of index.html made by scripts/deploy.mjs.
export default defineConfig({
  base: '/ets-server-updater/',
  plugins: [react(), tailwindcss()],
})
