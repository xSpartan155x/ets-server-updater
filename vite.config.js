import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Strict Content-Security-Policy for the packaged app (the dev server needs inline scripts for HMR).
// Remote images only from the Steam avatar servers (moderators in Server -> Configuration).
const csp = {
  name: 'csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace(
    '<head>',
    `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https://*.steamstatic.com; style-src 'self' 'unsafe-inline'; script-src 'self'">`,
  ),
};

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), csp],
  server: { port: 5173, strictPort: true },
  build: { outDir: 'out/renderer', emptyOutDir: true },
});
