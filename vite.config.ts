import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

// aion2.exchange sends no CORS headers, so the browser reaches it and aion2t.com's icons
// through the dev and preview servers.
const proxy: Record<string, ProxyOptions> = {
  '/ex': { target: 'https://aion2.exchange', changeOrigin: true, rewrite: (path) => path.replace(/^\/ex/, '') },
  '/a2t': { target: 'https://aion2t.com', changeOrigin: true, rewrite: (path) => path.replace(/^\/a2t/, '') },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('/src/data/') && id.endsWith('.json') ? 'data' : undefined),
      },
    },
  },
})
