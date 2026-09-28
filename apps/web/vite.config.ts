import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// `bun run dev` proxies to a running `docker compose up` stack on :8000,
// so you get hot reload against the real API, database and Reverb.
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/app': { target: 'ws://localhost:8000', ws: true },
    },
  },
})
