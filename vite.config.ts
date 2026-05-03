import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/liftosaur-api': {
        target: 'https://www.liftosaur.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/liftosaur-api/, '/api/v1'),
      },
    },
  },
})
